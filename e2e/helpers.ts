import { Page } from '@playwright/test';

/** Shape recorded by the speechSynthesis stub (see stubSpeech). */
export interface TtsLog {
  spoken: string[];
  cancels: number;
}

/**
 * Replaces window.speechSynthesis with a deterministic stub that records
 * every speak/cancel call into `window.__tts` (spec-06 R6.4).
 */
export async function stubSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const log = { spoken: [], cancels: 0 };
    (window as unknown as { __tts: unknown }).__tts = log;
    class FakeUtterance {
      text: string;
      lang = '';
      rate = 1;
      voice: unknown = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: FakeUtterance,
      configurable: true,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak(utterance: { text: string }) {
          log.spoken.push(utterance.text);
        },
        cancel() {
          log.cancels += 1;
        },
        getVoices() {
          return [];
        },
      },
      configurable: true,
    });
  });
}

export async function ttsLog(page: Page): Promise<TtsLog> {
  return page.evaluate(() => (window as unknown as { __tts: TtsLog }).__tts);
}

/**
 * Serves deterministic dictionary fixtures for `GET /api/dictionary`,
 * echoing the requested term back. `status` lets tests exercise the
 * "no entry" path without any external network.
 */
export async function mockDictionary(
  page: Page,
  options: { status?: number; phonetic?: string } = {},
): Promise<void> {
  const status = options.status ?? 200;
  await page.route('**/api/dictionary*', async (route) => {
    const term = new URL(route.request().url()).searchParams.get('term') ?? '';
    if (status !== 200) {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: `No entry found for "${term}".` }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        term,
        phonetic: options.phonetic ?? `/${term}/`,
        partOfSpeech: 'noun',
        definitions: [{ text: `mock meaning of ${term}` }],
        source: 'wiktionary',
      }),
    });
  });
}

/**
 * Starts a session with the given text from the home page. Pass
 * `difficulty: 'easy'` to pick the Easy level before submitting (spec-07);
 * defaults to Normal, which is the app default.
 */
export async function startSession(
  page: Page,
  text: string,
  difficulty: 'normal' | 'easy' = 'normal',
): Promise<void> {
  await page.goto('/');
  await page.getByTestId('home-textarea').fill(text);
  if (difficulty === 'easy') {
    await page.getByTestId('difficulty-easy').click();
  }
  await page.getByTestId('home-submit').click();
  await page.waitForURL('**/practice');
}
