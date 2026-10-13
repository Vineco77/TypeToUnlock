/** Part-of-speech labels used by the result view (English, lowercase). */
export type PosLabel =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'determiner'
  | 'preposition'
  | 'conjunction'
  | 'other';

/** A shallow grammatical chunk covering a contiguous word range of a sentence. */
export interface ChunkAnalysis {
  label: string;
  /** first word index (inclusive) */
  start: number;
  /** last word index (inclusive) */
  end: number;
}

export interface WordAnalysis {
  index: number;
  /** original token, including punctuation (e.g. "customers,") */
  text: string;
  /** comparison/dictionary form: letters only, lowercase (e.g. "customers") */
  base: string;
  pos: PosLabel;
  /** raw NLP tags (server-side only, used by the chunker heuristics) */
  tags?: string[];
}

export interface SentenceAnalysis {
  text: string;
  words: WordAnalysis[];
  chunks: ChunkAnalysis[];
}

export interface AnalyzeResponse {
  sentences: SentenceAnalysis[];
}

export interface DictionaryDefinition {
  text: string;
  example?: string;
}

export interface DictionaryEntry {
  term: string;
  phonetic?: string;
  partOfSpeech?: string;
  definitions: DictionaryDefinition[];
  source: 'freedictionaryapi' | 'wiktionary' | 'none';
}

/** Difficulty levels: `normal` is audio-only, `easy` also shows the
 * sentence being practiced while the challenge runs. */
export type Difficulty = 'normal' | 'easy';

/** Session state for one word of a practice sentence. */
export type WordStatus = 'pending' | 'correct' | 'revealed';

export interface SessionWord {
  /** token as written in the source text (may include punctuation) */
  text: string;
  /** clean comparison form (letters only, lowercase) */
  base: string;
  status: WordStatus;
  /** true when the answer was shown via Ctrl+; (still pending, R3.8) */
  answerShown?: boolean;
}

export interface SentenceSession {
  text: string;
  words: SessionWord[];
  errorCount: number;
  revealCount: number;
}

export interface SessionState {
  sentences: SentenceSession[];
  currentSentence: number;
  totalErrors: number;
  totalReveals: number;
  startedAt: number;
  /** Chosen before starting; defaults to `normal` (spec-07). */
  difficulty: Difficulty;
}
