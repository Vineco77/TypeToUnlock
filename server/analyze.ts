import nlp from 'compromise';
import type { ChunkAnalysis, PosLabel, SentenceAnalysis, WordAnalysis } from '../src/app/core/models';

/**
 * Shallow grammatical analysis of an English text.
 *
 * POS tagging comes from `compromise` (MIT). Chunking (Subject / Verb /
 * Phrasal verb / Prepositional phrase / Object / ...) is heuristic on top of
 * the POS tags: this is a shallow parser, not a full syntax parser, which is
 * an accepted trade-off for a 100% free personal project.
 */

interface TaggedTerm {
  text: string;
  pre?: string;
  post?: string;
  tags: string[];
}

const PARTICLES = new Set([
  'up', 'down', 'out', 'off', 'in', 'on', 'away', 'back', 'over',
  'about', 'along', 'around', 'through', 'together', 'apart', 'ahead',
]);

const NOMINAL_POS: ReadonlySet<PosLabel> = new Set<PosLabel>([
  'determiner', 'adjective', 'noun', 'pronoun', 'adverb', 'other',
]);

/** Maps compromise tag soup into the app's small POS vocabulary. */
export function mapPos(tags: string[], text: string): PosLabel {
  const has = (tag: string) => tags.includes(tag);
  if (has('Pronoun')) return 'pronoun';
  if (has('Determiner')) return 'determiner';
  if (has('Preposition')) return 'preposition';
  if (has('Conjunction')) return 'conjunction';
  if (has('Adjective')) return 'adjective';
  if (has('Adverb')) return 'adverb';
  if (has('Verb') || has('Infinitive') || has('Particle')) return 'verb';
  if (has('Noun')) return 'noun';
  if (text === 'to') return 'other';
  return 'other';
}

function isVerbWord(word: { pos: PosLabel }): boolean {
  return word.pos === 'verb';
}

/**
 * Groups words into non-overlapping chunks covering the whole sentence.
 * Guarantees: chunks are ordered, contiguous and cover [0, words.length-1].
 */
export function chunkWords(words: WordAnalysis[]): ChunkAnalysis[] {
  const chunks: ChunkAnalysis[] = [];
  let i = 0;
  let sawVerb = false;

  while (i < words.length) {
    const word = words[i];

    // Prepositional phrase: preposition + following nominal run.
    if (word.pos === 'preposition') {
      let j = i + 1;
      while (j < words.length && NOMINAL_POS.has(words[j].pos) && words[j].pos !== 'other') {
        j++;
      }
      chunks.push({ label: 'Prepositional phrase', start: i, end: j - 1 });
      i = j;
      continue;
    }

    // Verb phrase (possibly phrasal): verbs, "to" + verb, particles, adverbs between verbs.
    if (isVerbWord(word) || (word.base === 'to' && i + 1 < words.length && isVerbWord(words[i + 1]))) {
      let j = i;
      let phrasal = false;
      while (j < words.length) {
        const current = words[j];
        // Particle right after a verb makes it a phrasal verb ("look up").
        // Checked first: compromise tags particles as verbs, so "up" would
        // otherwise be swallowed by the plain-verb branch below.
        if (
          j > i &&
          isVerbWord(words[j - 1]) &&
          (current.tags?.includes('Particle') === true ||
            ((current.pos === 'other' || current.pos === 'adverb' || current.pos === 'preposition') &&
              PARTICLES.has(current.base)))
        ) {
          phrasal = true;
          j++;
          continue;
        }
        if (isVerbWord(current)) {
          j++;
          continue;
        }
        // "to" + verb stays inside the verb phrase ("need to reconnect").
        if (current.base === 'to' && j + 1 < words.length && isVerbWord(words[j + 1])) {
          j++;
          continue;
        }
        // Adverb splitting verbs stays inside the verb phrase.
        if (current.pos === 'adverb' && j + 1 < words.length && isVerbWord(words[j + 1])) {
          j++;
          continue;
        }
        break;
      }
      chunks.push({ label: phrasal ? 'Phrasal verb' : 'Verb', start: i, end: j - 1 });
      sawVerb = true;
      i = j;
      continue;
    }

    // Nominal run: Subject when it precedes the first verb, Object after it.
    if (NOMINAL_POS.has(word.pos)) {
      let j = i;
      while (j < words.length && NOMINAL_POS.has(words[j].pos)) {
        j++;
      }
      chunks.push({ label: sawVerb ? 'Object' : 'Subject', start: i, end: j - 1 });
      i = j;
      continue;
    }

    // Conjunction (or anything else): standalone chunk.
    chunks.push({ label: 'Conjunction', start: i, end: i });
    i++;
  }

  return chunks;
}

/** Splits text into sentences, keeping terminators (same rule as the frontend). */
export function splitSentences(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];
  const sentences: string[] = [];
  for (const line of normalized.split('\n')) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    const parts = trimmedLine.match(/[^.!?]+[.!?]*\s*/g) ?? [trimmedLine];
    for (const part of parts) {
      const sentence = part.trim();
      if (sentence) sentences.push(sentence);
    }
  }
  return sentences;
}

function toBase(token: string): string {
  return token
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();
}

/** Analyzes a full text into sentences with per-word POS and shallow chunks. */
export function analyzeText(text: string): { sentences: SentenceAnalysis[] } {
  const sentences: SentenceAnalysis[] = [];
  for (const sentence of splitSentences(text)) {
    const doc = nlp(sentence);
    const json = doc.sentences().json({ terms: { text: true, tags: true } }) as Array<{
      terms: TaggedTerm[];
    }>;
    const terms = json[0]?.terms ?? [];

    const words: WordAnalysis[] = terms.map((term, index) => {
      const text_ = `${term.pre ?? ''}${term.text}${term.post ?? ''}`;
      return {
        index,
        text: text_,
        base: toBase(term.text),
        pos: mapPos(term.tags ?? [], term.text),
        tags: term.tags ?? [],
      };
    }).filter((word) => word.base.length > 0)
      .map((word, index) => ({ ...word, index }));

    sentences.push({ text: sentence, words, chunks: chunkWords(words) });
  }
  return { sentences };
}
