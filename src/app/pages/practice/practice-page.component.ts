import {
  Component,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  AfterViewInit,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SessionService } from '../../core/session.service';
import { TTS_SERVICE, TtsService } from '../../core/tts/tts.service';
import { TypingEngine, TypingState } from '../../typing/typing.engine';

/**
 * Audio-only typing challenge (spec-03).
 *
 * The target word is never displayed: the only hints are the audio
 * (Ctrl+. replays the sentence, restarting it when already playing), the
 * number of characters rendered as "bottom lines", and the per-character
 * correct/wrong feedback. Ctrl+; reveals the current word (amber) while the
 * shortcut is held and counts as a hint.
 */
@Component({
  selector: 'app-practice-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './practice-page.component.html',
  styleUrl: './practice-page.component.css',
})
export class PracticePageComponent implements OnInit, AfterViewInit, OnDestroy {
  private engine: TypingEngine | null = null;
  private readonly destroy$ = new Subject<void>();
  private advanceTimer: ReturnType<typeof setTimeout> | null = null;
  private revealShortcutHeld = false;
  readonly isBrowser: boolean;

  state: TypingState | null = null;
  hintUsed = false;

  constructor(
    public readonly session: SessionService,
    @Inject(TTS_SERVICE) private readonly tts: TtsService,
    private readonly router: Router,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.session.hasSession()) {
      this.router.navigate(['/']);
      return;
    }
    // Already-finished sentence (e.g. navigating back): show the analysis.
    if (this.session.isCurrentSentenceComplete()) {
      this.router.navigate(['/result']);
      return;
    }
    this.startCurrentWord();
  }

  ngAfterViewInit(): void {
    // R3.11: play the sentence once the view has rendered so playback starts
    // from the beginning instead of mid-sentence.
    this.startListening();
  }

  ngOnDestroy(): void {
    this.clearAdvanceTimer();
    this.tts.cancel();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** R3.11: play the current sentence once when it starts. Deferred until the
   * view has rendered so the utterance is queued after the page is fully
   * loaded, avoiding playback that starts mid-sentence. */
  private startListening(): void {
    const sentence = this.session.currentSentence();
    if (sentence) {
      this.tts.speak(sentence.text);
    }
  }

  /** Global shortcuts: Ctrl+. replay, Ctrl+; reveal while held. */
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey && (event.key === '.' || event.key === 'Period')) {
      event.preventDefault();
      const sentence = this.session.currentSentence();
      if (sentence) {
        // R3.7: restart from the beginning even when already playing.
        this.tts.restart(sentence.text);
      }
      return;
    }
    if (event.ctrlKey && (event.key === ';' || event.key === 'Semicolon')) {
      event.preventDefault();
      if (!this.engine || this.engine.isFinished) {
        return;
      }
      if (!this.revealShortcutHeld && !event.repeat) {
        this.revealShortcutHeld = true;
        this.state = this.engine.reveal();
        this.session.markRevealed(); // counts as a hint, no advance (R3.8)
      }
      return;
    }
    if (!this.engine) {
      return;
    }
    if (event.key === 'Backspace') {
      if (this.engine.isFinished) {
        return;
      }
      event.preventDefault();
      this.state = this.engine.backspace();
      return;
    }
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (this.engine.isFinished) {
      return;
    }
    event.preventDefault();
    this.handleTypedChar(event.key);
  }

  @HostListener('document:keyup', ['$event'])
  onKeyup(event: KeyboardEvent): void {
    if (
      !this.revealShortcutHeld ||
      (event.key !== ';' &&
        event.key !== 'Semicolon' &&
        event.key !== 'Control')
    ) {
      return;
    }
    this.revealShortcutHeld = false;
    if (this.engine && !this.engine.isFinished) {
      this.state = this.engine.hideReveal();
    }
  }

  private handleTypedChar(char: string): void {
    if (!this.engine) {
      return;
    }
    const wasWrong = this.state?.status === 'wrong';
    this.state = this.engine.type(char);

    if (this.state.status === 'wrong' && !wasWrong) {
      // First full-length failure on this word: count one error and lock.
      this.session.recordError();
    }
    if (this.state.status === 'correct') {
      this.hintUsed = false;
      this.session.markCorrect();
      this.scheduleAdvance();
    }
  }

  private scheduleAdvance(): void {
    this.clearAdvanceTimer();
    this.advanceTimer = setTimeout(() => {
      this.advanceTimer = null;
      this.advance();
    }, 100);
  }

  private advance(): void {
    if (this.session.isCurrentSentenceComplete()) {
      this.tts.cancel();
      this.router.navigate(['/result']);
      return;
    }
    this.startCurrentWord();
  }

  private startCurrentWord(): void {
    const sentence = this.session.currentSentence();
    const index = this.session.currentWordIndex();
    if (!sentence || index < 0) {
      return;
    }
    this.engine = new TypingEngine(sentence.words[index].base);
    this.state = this.engine.state();
    this.revealShortcutHeld = false;
    this.hintUsed = false;
  }

  private clearAdvanceTimer(): void {
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer);
      this.advanceTimer = null;
    }
  }

  get sentenceNumber(): number {
    return (this.session.session()?.currentSentence ?? 0) + 1;
  }

  get totalSentences(): number {
    return this.session.totalSentences();
  }

  get progressPercent(): number {
    const sentence = this.session.currentSentence();
    if (!sentence) {
      return 0;
    }
    const done = sentence.words.filter((w) => w.status !== 'pending').length;
    return (done / sentence.words.length) * 100;
  }

  get slotCount(): number {
    return this.state?.length ?? 0;
  }

  /** Index of the word being typed (used by tests and debugging). */
  get currentWordIndex(): number {
    return this.session.currentWordIndex();
  }

  /** Positions still empty, rendered as "bottom lines". */
  blankSlots(): number[] {
    const filled = this.state?.chars.length ?? 0;
    return Array.from({ length: Math.max(this.slotCount - filled, 0) }, (_, i) => i);
  }

  onReplay(): void {
    const sentence = this.session.currentSentence();
    if (sentence) {
      this.tts.restart(sentence.text);
    }
  }
}
