import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import {
  SentenceSession,
  SessionState,
  SessionWord,
  WordStatus,
} from './models';
import { SentenceSplitterService } from './sentence-splitter.service';

const STORAGE_KEY = 'type-to-unlock.session';

/**
 * Removes everything but letters from a token so comparison ignores
 * punctuation, accents and case (non-functional requirement).
 */
export function toBaseWord(token: string): string {
  return token
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();
}

/**
 * Global session state: list of practice sentences, per-word status and
 * stats. Persisted to sessionStorage so a page reload keeps progress.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly state = signal<SessionState | null>(null);

  /** Current session or null when there is none. */
  readonly session = this.state.asReadonly();

  constructor(
    private readonly splitter: SentenceSplitterService,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {
    this.restore();
  }

  get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  hasSession(): boolean {
    return this.state() !== null;
  }

  createSession(text: string): boolean {
    const sentences = this.splitter
      .splitIntoSentences(text)
      .map<SentenceSession>((sentence) => ({
        text: sentence,
        words: this.tokenize(sentence),
        errorCount: 0,
        revealCount: 0,
      }))
      .filter((sentence) => sentence.words.length > 0);

    if (sentences.length === 0) {
      return false;
    }

    this.state.set({
      sentences,
      currentSentence: 0,
      totalErrors: 0,
      totalReveals: 0,
      startedAt: Date.now(),
    });
    this.persist();
    return true;
  }

  currentSentence(): SentenceSession | null {
    const session = this.state();
    if (!session) {
      return null;
    }
    return session.sentences[session.currentSentence] ?? null;
  }

  currentWordIndex(): number {
    const sentence = this.currentSentence();
    if (!sentence) {
      return -1;
    }
    const index = sentence.words.findIndex((w) => w.status === 'pending');
    return index;
  }

  totalSentences(): number {
    return this.state()?.sentences.length ?? 0;
  }

  isLastSentence(): boolean {
    const session = this.state();
    return !!session && session.currentSentence >= session.sentences.length - 1;
  }

  /** Marks the current word as typed correctly (green). */
  markCorrect(): void {
    this.updateCurrentWord('correct');
  }

  /** Records that the answer was shown for the current word (Ctrl+;).
   * The word stays pending — the user still has to type it (R3.8). */
  markRevealed(): void {
    const session = this.state();
    const sentence = this.currentSentence();
    if (!session || !sentence) {
      return;
    }
    const index = sentence.words.findIndex((w) => w.status === 'pending');
    if (index === -1) {
      return;
    }
    sentence.words[index].answerShown = true;
    sentence.revealCount += 1;
    session.totalReveals += 1;
    this.commit();
  }

  /** Records one failed attempt on the current word. */
  recordError(): void {
    const session = this.state();
    const sentence = this.currentSentence();
    if (!session || !sentence) {
      return;
    }
    sentence.errorCount += 1;
    session.totalErrors += 1;
    this.commit();
  }

  /** True when every word of the current sentence is resolved. */
  isCurrentSentenceComplete(): boolean {
    const sentence = this.currentSentence();
    if (!sentence) {
      return true;
    }
    return sentence.words.every((w) => w.status !== 'pending');
  }

  /** Moves to the next sentence; returns false when it was the last one. */
  advanceSentence(): boolean {
    const session = this.state();
    if (!session || session.currentSentence >= session.sentences.length - 1) {
      return false;
    }
    session.currentSentence += 1;
    this.commit();
    return true;
  }

  /** Jumps to a given sentence (used by "review" links on the summary). */
  goToSentence(index: number): boolean {
    const session = this.state();
    if (!session || index < 0 || index >= session.sentences.length) {
      return false;
    }
    session.currentSentence = index;
    this.commit();
    return true;
  }

  clear(): void {
    this.state.set(null);
    if (this.isBrowser) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  private updateCurrentWord(status: WordStatus): void {
    const session = this.state();
    const sentence = this.currentSentence();
    if (!session || !sentence) {
      return;
    }
    const index = sentence.words.findIndex((w) => w.status === 'pending');
    if (index === -1) {
      return;
    }
    sentence.words[index].status = status;
    this.commit();
  }

  private commit(): void {
    // signal writes are enough for reactivity; re-set to notify observers.
    this.state.set({ ...this.state()! });
    this.persist();
  }

  private tokenize(sentence: string): SessionWord[] {
    return sentence
      .split(/\s+/)
      .filter((token) => token.trim() !== '')
      .map((token) => ({
        text: token,
        base: toBaseWord(token),
        status: 'pending' as WordStatus,
      }))
      .filter((word) => word.base.length > 0);
  }

  private persist(): void {
    if (!this.isBrowser) {
      return;
    }
    const session = this.state();
    if (session) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }

  private restore(): void {
    if (!this.isBrowser) {
      return;
    }
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as SessionState;
      if (parsed?.sentences?.length) {
        this.state.set(parsed);
      }
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }
}
