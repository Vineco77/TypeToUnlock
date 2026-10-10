import { Injectable } from '@angular/core';

/**
 * Splits a user-provided English text into practice sentences.
 * Separators: `.`, `!`, `?` (kept in the sentence text) and line breaks.
 * Empty/whitespace-only fragments are discarded.
 */
@Injectable({ providedIn: 'root' })
export class SentenceSplitterService {
  splitIntoSentences(text: string): string[] {
    const normalized = text.replace(/\r\n?/g, '\n').trim();
    if (!normalized) {
      return [];
    }

    const sentences: string[] = [];
    // Split on line breaks first, then on sentence terminators (kept attached).
    for (const line of normalized.split('\n')) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        continue;
      }
      const parts = trimmedLine.match(/[^.!?]+[.!?]*\s*/g) ?? [trimmedLine];
      for (const part of parts) {
        const sentence = part.trim();
        if (sentence) {
          sentences.push(sentence);
        }
      }
    }
    return sentences;
  }
}
