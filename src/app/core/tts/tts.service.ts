import { Injectable, Inject, InjectionToken, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export interface TtsOptions {
  lang?: string;
  rate?: number;
}

/**
 * Audio adapter abstraction. The default implementation uses the browser
 * Web Speech API (free, unlimited, offline). Swapping to another provider
 * (StreamElements, Google TTS, ...) only requires a new provider for
 * TTS_SERVICE without touching consumers.
 */
export abstract class TtsService {
  abstract speak(text: string, opts?: TtsOptions): void;
  /** Plays `text` from the start, interrupting any ongoing playback. */
  abstract restart(text: string, opts?: TtsOptions): void;
  abstract cancel(): void;
  abstract readonly isSpeaking$: Observable<boolean>;
  /** True when the current platform can produce speech. */
  abstract readonly supported: boolean;
}

export const TTS_SERVICE = new InjectionToken<TtsService>('TTS_SERVICE');

const DEFAULT_OPTS: Required<TtsOptions> = { lang: 'en-US', rate: 1 };

/** Web Speech API (speechSynthesis) adapter — free and offline. */
@Injectable()
export class SpeechSynthesisTts extends TtsService {
  private readonly speaking = new BehaviorSubject<boolean>(false);
  readonly isSpeaking$ = this.speaking.asObservable();
  readonly supported: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    super();
    this.supported = isPlatformBrowser(platformId) && 'speechSynthesis' in window;
  }

  speak(text: string, opts?: TtsOptions): void {
    if (!this.supported || !text.trim()) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const options = { ...DEFAULT_OPTS, ...opts };
    utterance.lang = options.lang;
    utterance.rate = options.rate;
    const voice = this.pickEnglishVoice(options.lang);
    if (voice) {
      utterance.voice = voice;
    }
    utterance.onstart = () => this.speaking.next(true);
    utterance.onend = () => this.speaking.next(false);
    utterance.onerror = () => this.speaking.next(false);
    window.speechSynthesis.speak(utterance);
  }

  restart(text: string, opts?: TtsOptions): void {
    if (!this.supported) {
      return;
    }
    // Always stop current playback so `text` starts from the beginning.
    window.speechSynthesis.cancel();
    this.speak(text, opts);
  }

  cancel(): void {
    if (!this.supported) {
      return;
    }
    window.speechSynthesis.cancel();
    this.speaking.next(false);
  }

  private pickEnglishVoice(lang: string): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
      return null;
    }
    const exact = voices.find((v) => v.lang === lang);
    if (exact) {
      return exact;
    }
    return voices.find((v) => v.lang.startsWith('en')) ?? null;
  }
}

/** No-op implementation for SSR / unsupported browsers. */
@Injectable()
export class NullTts extends TtsService {
  private readonly speaking = new BehaviorSubject<boolean>(false);
  readonly isSpeaking$ = this.speaking.asObservable();
  readonly supported = false;
  speak(): void {}
  restart(): void {}
  cancel(): void {}
}

export function ttsServiceFactory(platformId: object): TtsService {
  if (isPlatformBrowser(platformId) && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return new SpeechSynthesisTts(platformId);
  }
  return new NullTts();
}

/** Provider registered by the app config. */
export const TTS_PROVIDER = {
  provide: TTS_SERVICE,
  useFactory: ttsServiceFactory,
  deps: [PLATFORM_ID],
};
