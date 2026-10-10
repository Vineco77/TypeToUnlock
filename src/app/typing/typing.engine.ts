/**
 * Pure typing engine for the audio-only word challenge.
 *
 * Rules (spec-03):
 * - the target is never displayed; only its length drives the slots;
 * - evaluation happens automatically on each keystroke (no Enter);
 * - comparison is case-insensitive and ignores accents/punctuation;
 * - when the typed length reaches the target length the word is evaluated:
 *   exact match -> correct (green, advance); otherwise only the divergent
 *   characters are marked wrong (red) and the input locks (no more keys
 *   accepted) until the user deletes and fixes the same word.
 */
export type CharStatus = 'pending' | 'correct' | 'wrong';
export type TypingStatus = 'typing' | 'wrong' | 'correct';

export interface TypingChar {
  /** typed character as entered (display purposes) */
  char: string;
  status: CharStatus;
}

export interface TypingState {
  /** letters-only lowercase target */
  target: string;
  /** how many characters the target has (slot count) */
  length: number;
  chars: TypingChar[];
  /** remaining target characters shown as ghost text after Ctrl+; */
  preview: string[] | null;
  status: TypingStatus;
  /** no more keys are accepted (full-length wrong word) */
  locked: boolean;
}

export function normalizeChar(char: string): string {
  return char
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export class TypingEngine {
  private target = '';
  private typed = '';
  private currentStatus: TypingStatus = 'typing';
  /** Ctrl+; pressed on the current word: shows the answer but the user
   * still has to type the word before it advances (R3.8). */
  private revealed = false;

  constructor(target: string) {
    this.reset(target);
  }

  reset(target: string): void {
    this.target = target;
    this.typed = '';
    this.currentStatus = 'typing';
    this.revealed = false;
  }

  get isFinished(): boolean {
    return this.currentStatus === 'correct';
  }

  get isRevealed(): boolean {
    return this.revealed;
  }

  /**
   * Feeds one keystroke. Returns the new state; ignores the key when the
   * word is finished or the input is locked at the target length.
   */
  type(rawChar: string): TypingState {
    if (this.isFinished || this.typed.length >= this.target.length) {
      return this.state();
    }
    const char = normalizeChar(rawChar);
    if (!char || !/[a-z0-9]/.test(char)) {
      return this.state();
    }
    this.typed += char;
    this.evaluate();
    return this.state();
  }

  /** Removes the last typed character (also unlocks a wrong word). */
  backspace(): TypingState {
    if (this.isFinished || this.typed.length === 0) {
      return this.state();
    }
    this.typed = this.typed.slice(0, -1);
    this.currentStatus = 'typing';
    return this.state();
  }

  /** Ctrl+; hint: shows the answer but does NOT finish the word —
   * the user still has to type it (R3.8). */
  reveal(): TypingState {
    if (this.isFinished) {
      return this.state();
    }
    this.revealed = true;
    return this.state();
  }

  private evaluate(): void {
    if (this.typed.length < this.target.length) {
      this.currentStatus = 'typing';
      return;
    }
    this.currentStatus = this.typed === this.target ? 'correct' : 'wrong';
  }

  state(): TypingState {
    const chars: TypingChar[] = [];
    for (let i = 0; i < this.typed.length; i++) {
      const status: CharStatus =
        this.typed[i] === this.target[i] ? 'correct' : 'wrong';
      chars.push({ char: this.typed[i], status });
    }
    const preview =
      this.revealed && this.typed.length < this.target.length
        ? this.target.slice(this.typed.length).split('')
        : null;
    return {
      target: this.target,
      length: this.target.length,
      chars,
      preview,
      status: this.currentStatus,
      locked: this.currentStatus === 'wrong',
    };
  }
}
