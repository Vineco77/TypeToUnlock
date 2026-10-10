import {
  Component,
  ElementRef,
  HostListener,
  Inject,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SessionService } from '../../core/session.service';
import { AnalysisService } from '../../core/analysis.service';
import { DictionaryService } from '../../core/dictionary.service';
import { TTS_SERVICE, TtsService } from '../../core/tts/tts.service';
import {
  ChunkAnalysis,
  DictionaryEntry,
  SentenceAnalysis,
  WordAnalysis,
} from '../../core/models';

export interface SelectionPopup {
  start: number;
  end: number;
  term: string;
  top: number;
  left: number;
}

/**
 * Result view (spec-05): the full sentence with its shallow grammatical
 * analysis — chunk boxes with badges, IPA above each word, POS label and
 * colored underline below. Selecting one or more words with the mouse opens
 * a popup with the English meaning and a button that speaks only the
 * selection.
 */
@Component({
  selector: 'app-result-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './result-page.component.html',
  styleUrl: './result-page.component.css',
})
export class ResultPageComponent implements OnInit {
  @ViewChild('sentenceArea') private sentenceArea?: ElementRef<HTMLElement>;

  analysis: SentenceAnalysis | null = null;
  loading = false;
  loadError = '';
  phonetics = new Map<number, string>();
  popup: SelectionPopup | null = null;
  popupEntry: DictionaryEntry | null = null;
  popupLoading = false;
  popupFailed = false;

  private popupSub?: Subscription;

  constructor(
    public readonly session: SessionService,
    private readonly analysisService: AnalysisService,
    private readonly dictionary: DictionaryService,
    @Inject(TTS_SERVICE) private readonly tts: TtsService,
    private readonly router: Router,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  ngOnInit(): void {
    const sentence = this.session.currentSentence();
    if (!sentence) {
      this.router.navigate(['/']);
      return;
    }
    this.loading = true;
    this.analysisService.analyze(sentence.text).subscribe({
      next: (response) => {
        this.analysis =
          response.sentences.find((s) => s.text === sentence.text) ??
          response.sentences[0] ??
          null;
        this.loading = false;
        this.loadPhonetics();
      },
      error: () => {
        this.loading = false;
        this.loadError = 'Could not load the grammatical analysis. Try again later.';
      },
    });
  }

  /** R5.6: play the whole sentence. */
  listen(): void {
    const sentence = this.session.currentSentence();
    if (sentence) {
      this.tts.restart(sentence.text);
    }
  }

  /** R5.6: next sentence or final summary. */
  next(): void {
    this.tts.cancel();
    if (this.session.advanceSentence()) {
      this.router.navigate(['/practice']);
    } else {
      this.router.navigate(['/summary']);
    }
  }

  /** R5.3/R5.4: detect the mouse selection and open the meaning popup. */
  onMouseUp(): void {
    if (!isPlatformBrowser(this.platformId) || !this.analysis) {
      return;
    }
    const selection = window.getSelection();
    const container = this.sentenceArea?.nativeElement;
    if (!selection || selection.isCollapsed || !container || selection.rangeCount === 0) {
      this.closePopup();
      return;
    }
    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      this.closePopup();
      return;
    }

    let start = Infinity;
    let end = -Infinity;
    const spans = container.querySelectorAll<HTMLElement>('[data-word-index]');
    spans.forEach((span) => {
      const index = Number(span.dataset['wordIndex']);
      if (range.intersectsNode(span)) {
        start = Math.min(start, index);
        end = Math.max(end, index);
      }
    });
    if (start === Infinity) {
      this.closePopup();
      return;
    }

    const words = this.analysis.words.slice(start, end + 1);
    const rect = range.getBoundingClientRect();
    this.popup = {
      start,
      end,
      term: words.map((w) => w.base).join(' '),
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX,
    };
    this.popupEntry = null;
    this.popupFailed = false;
    this.popupLoading = true;

    this.popupSub?.unsubscribe();
    this.popupSub = this.dictionary.lookup(this.popup.term).subscribe((entry) => {
      this.popupLoading = false;
      if (entry) {
        this.popupEntry = entry;
      } else {
        this.popupFailed = true;
      }
    });
  }

  /** R5.3: speak only the selected words. */
  playSelection(): void {
    if (!this.popup || !this.analysis) {
      return;
    }
    const text = this.analysis.words
      .slice(this.popup.start, this.popup.end + 1)
      .map((w) => w.text.trim())
      .join(' ');
    this.tts.restart(text);
  }

  closePopup(): void {
    this.popup = null;
    this.popupEntry = null;
    this.popupSub?.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closePopup();
  }

  /** Closes the popup when clicking outside the sentence area / popup. */
  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.popup) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest('.meaning-popup') || target.closest('[data-sentence-area]')) {
      return;
    }
    this.closePopup();
  }

  wordsOf(chunk: ChunkAnalysis): WordAnalysis[] {
    return this.analysis?.words.slice(chunk.start, chunk.end + 1) ?? [];
  }

  chunkClass(chunk: ChunkAnalysis): string {
    return 'chunk-' + chunk.label.toLowerCase().replace(/\s+/g, '-');
  }

  private loadPhonetics(): void {
    const sentence = this.session.currentSentence();
    if (!sentence || !this.analysis) {
      return;
    }
    const seen = new Set<string>();
    for (const word of this.analysis.words) {
      if (!word.base || seen.has(word.base)) {
        continue;
      }
      seen.add(word.base);
      this.dictionary.lookup(word.base).subscribe((entry) => {
        if (entry?.phonetic) {
          this.phonetics.set(word.index, entry.phonetic);
        }
      });
    }
  }
}
