/**
 * Dictionary lookups — 100% free, no API keys.
 *
 * Primary source:  https://freedictionaryapi.com/api/v1/entries/en/{term}
 *   (IPA + definitions + POS, supports phrasal verbs like "look up")
 * Fallback source: https://en.wiktionary.org/api/rest_v1/page/definition/{term}
 *   (covers phrases too, but definitions come as HTML that must be sanitized)
 *
 * Multi-word terms: first the full phrase, then a per-word combination
 * labeled "literal translation" (spec-04 R4.3).
 */

export interface DictDefinition {
  text: string;
  example?: string;
}

export interface DictResult {
  term: string;
  phonetic?: string;
  partOfSpeech?: string;
  definitions: DictDefinition[];
  source: 'freedictionaryapi' | 'wiktionary' | 'none';
  /** Per-word breakdown for multi-word fallbacks. */
  parts?: Array<{ term: string; entry: DictResult | null }>;
}

export class UpstreamTimeoutError extends Error {
  constructor() {
    super('Dictionary upstream timed out');
    this.name = 'UpstreamTimeoutError';
  }
}

export type FetchLike = (url: string) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

const TIMEOUT_MS = 10_000;

async function fetchJson(url: string, fetchImpl: FetchLike): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(url);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new UpstreamTimeoutError();
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Strips HTML tags and decodes the few entities Wiktionary emits. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTerm(term: string): string {
  return term.trim().replace(/\s+/g, ' ');
}

/* --------------------------- freedictionaryapi --------------------------- */

interface FreeDictSense {
  definition?: string;
  examples?: string[];
  subsenses?: Array<{ definition?: string; examples?: string[] }>;
}

interface FreeDictEntry {
  partOfSpeech?: string;
  pronunciations?: Array<{ type?: string; text?: string }>;
  senses?: FreeDictSense[];
}

interface FreeDictResponse {
  word?: string;
  entries?: FreeDictEntry[];
}

function parseFreeDictionary(term: string, data: unknown): DictResult | null {
  const response = data as FreeDictResponse;
  const entry = response?.entries?.[0];
  if (!entry) return null;

  const phonetic = entry.pronunciations?.find((p) => p.type === 'ipa')?.text;
  const definitions: DictDefinition[] = [];
  for (const sense of entry.senses ?? []) {
    if (sense.definition) {
      definitions.push({
        text: sense.definition,
        example: sense.examples?.[0],
      });
    }
    for (const subsense of sense.subsenses ?? []) {
      if (subsense.definition) {
        definitions.push({
          text: subsense.definition,
          example: subsense.examples?.[0],
        });
      }
    }
  }
  if (definitions.length === 0) return null;

  return {
    term,
    phonetic,
    partOfSpeech: entry.partOfSpeech,
    definitions,
    source: 'freedictionaryapi',
  };
}

/* ------------------------------- wiktionary ------------------------------ */

interface WiktionarySense {
  definition?: string;
  examples?: string[];
}

interface WiktionaryGroup {
  partOfSpeech?: string;
  definitions?: WiktionarySense[];
}

function parseWiktionary(term: string, data: unknown): DictResult | null {
  const response = data as Record<string, WiktionaryGroup[] | undefined>;
  const groups = response?.['en'];
  const group = groups?.[0];
  if (!group) return null;

  const definitions: DictDefinition[] = [];
  for (const sense of group.definitions ?? []) {
    if (sense.definition) {
      const text = stripHtml(sense.definition);
      if (text) {
        definitions.push({ text, example: sense.examples?.[0] ? stripHtml(sense.examples[0]) : undefined });
      }
    }
  }
  if (definitions.length === 0) return null;

  return {
    term,
    partOfSpeech: group.partOfSpeech?.toLowerCase(),
    definitions,
    source: 'wiktionary',
  };
}

/* -------------------------------- lookups -------------------------------- */

function encodeTerm(term: string): string {
  return encodeURIComponent(term);
}

export async function lookupTerm(
  rawTerm: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<DictResult | null> {
  const term = normalizeTerm(rawTerm);
  if (!term) return null;
  const cacheKey = term.toLowerCase();

  // 1) freedictionaryapi (works for words and phrasal verbs).
  const freeData = await fetchJson(
    `https://freedictionaryapi.com/api/v1/entries/en/${encodeTerm(term)}`,
    fetchImpl,
  );
  if (freeData) {
    const parsed = parseFreeDictionary(term, freeData);
    if (parsed) return parsed;
  }

  // 2) Wiktionary REST (covers most words/phrases not found above).
  const wikiData = await fetchJson(
    `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeTerm(term)}`,
    fetchImpl,
  );
  if (wikiData) {
    const parsed = parseWiktionary(term, wikiData);
    if (parsed) return parsed;
  }

  // 3) Multi-word fallback: combine per-word meanings ("literal translation").
  const words = term.split(' ').filter(Boolean);
  if (words.length > 1) {
    const parts: Array<{ term: string; entry: DictResult | null }> = [];
    for (const word of words) {
      parts.push({ term: word, entry: await lookupTerm(word, fetchImpl) });
    }
    if (parts.some((part) => part.entry)) {
      return {
        term,
        partOfSpeech: 'literal translation',
        definitions: parts.flatMap((part) =>
          (part.entry?.definitions ?? []).slice(0, 1).map((definition) => ({
            text: `${part.term}: ${definition.text}`,
            example: definition.example,
          })),
        ),
        source: 'none',
        parts,
      };
    }
  }

  return null;
}
