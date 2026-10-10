import { test, expect, Page } from '@playwright/test';
import { mockDictionary, startSession, stubSpeech } from './helpers';

/**
 * spec-01 + spec-03 + spec-05 end-to-end: a two-sentence session typed
 * word by word (audio-only), ending on the summary page.
 */

/** Waits until the practice page is ready for word `index`. */
async function expectWord(page: Page, index: number): Promise<void> {
  const slots = page.getByTestId('word-slots');
  await expect(slots).toHaveAttribute('data-word-index', String(index));
  // Typed characters (blanks/reveal-preview excluded) are cleared only when
  // the engine for the next word actually starts (650ms after a correct word).
  await expect(
    slots.locator('[data-char-status="correct"], [data-char-status="wrong"]'),
  ).toHaveCount(0);
}

async function finishSentence(page: Page, words: string[], startIndex = 0): Promise<void> {
  for (let i = 0; i < words.length; i++) {
    await expectWord(page, startIndex + i);
    await page.keyboard.type(words[i]);
  }
}

test('complete a two-sentence session from input to summary (CA1.1/CA3.4)', async ({
  page,
}) => {
  await stubSpeech(page);
  await mockDictionary(page);

  await page.goto('/');
  await expect(page.getByTestId('home-page')).toBeVisible();
  await page.getByTestId('home-textarea').fill('We go home. They run fast.');
  await page.getByTestId('home-submit').click();

  await page.waitForURL('**/practice');
  await expect(page.getByTestId('sentence-counter')).toContainText(
    'Sentence 1 of 2',
  );

  // CA3.4: the target word is never in the DOM.
  const pageContent = await page.content();
  expect(pageContent).not.toContain('home');

  await finishSentence(page, ['we', 'go', 'home']);

  await page.waitForURL('**/result');
  const chunks = page.getByTestId('chunk');
  await expect(chunks).toHaveCount(3);
  await expect(chunks.nth(0).locator('.chunk-badge')).toHaveText('Subject');
  await expect(chunks.nth(1).locator('.chunk-badge')).toHaveText('Verb');
  await expect(chunks.nth(2).locator('.chunk-badge')).toHaveText('Object');
  await expect(chunks.nth(0).locator('.word')).toHaveCount(1);
  // IPA above and POS below each word (CA5.1).
  const firstWord = chunks.nth(0).locator('.word').nth(0);
  await expect(firstWord.locator('.ipa')).toHaveText('/we/');
  await expect(firstWord.locator('.pos')).toHaveText('pronoun');

  await page.getByTestId('result-next').click();
  await page.waitForURL('**/practice');
  await expect(page.getByTestId('sentence-counter')).toContainText(
    'Sentence 2 of 2',
  );

  await finishSentence(page, ['they', 'run', 'fast']);

  await page.waitForURL('**/result');
  await page.getByTestId('result-next').click();

  await page.waitForURL('**/summary');
  await expect(page.getByTestId('summary-page')).toBeVisible();
  await expect(page.getByTestId('stat-errors')).toHaveText('0');
  await expect(page.getByTestId('stat-reveals')).toHaveText('0');
});

test('wrong word shows only divergent chars in red and locks (CA3.1/CA3.6)', async ({
  page,
}) => {
  await stubSpeech(page);
  await mockDictionary(page);
  await startSession(page, 'We go.');

  await expectWord(page, 0);
  await page.keyboard.type('wx'); // wrong at index 1
  await expect(page.getByTestId('feedback-wrong')).toBeVisible();

  const slots = page.getByTestId('word-slots');
  await expect(slots.locator('.slot').nth(0)).toHaveAttribute(
    'data-char-status',
    'correct',
  );
  await expect(slots.locator('.slot').nth(1)).toHaveAttribute(
    'data-char-status',
    'wrong',
  );

  // CA3.6: extra keys are ignored while locked.
  await page.keyboard.type('abc');
  await expect(slots.locator('.slot')).toHaveCount(2);

  // CA3.1: delete and fix the same word, then it advances.
  await page.keyboard.press('Backspace');
  await page.keyboard.type('e');
  await expectWord(page, 1);
});

test('case-insensitive comparison (CA3.2)', async ({ page }) => {
  await stubSpeech(page);
  await mockDictionary(page);
  await startSession(page, 'We go home.');

  await finishSentence(page, ['WE', 'Go', 'HOME']);
  await page.waitForURL('**/result');
});

test('Ctrl+. restarts the sentence audio (CA2.1)', async ({ page }) => {
  await stubSpeech(page);
  await mockDictionary(page);
  await startSession(page, 'We go home.');

  // The sentence auto-plays once on start (R3.11).
  const initial = (await page.evaluate(
    () => (window as unknown as { __tts: { spoken: string[] } }).__tts.spoken,
  )).length;
  expect(initial).toBe(1);

  await page.keyboard.press('Control+Period');
  const afterOne = await page.evaluate(
    () => (window as unknown as { __tts: { spoken: string[] } }).__tts.spoken,
  );
  expect(afterOne.length).toBe(2);
  expect(afterOne[1]).toBe('We go home.');

  await page.keyboard.press('Control+Period');
  const afterTwo = await page.evaluate(
    () => (window as unknown as { __tts: { spoken: string[]; cancels: number } }).__tts,
  );
  expect(afterTwo.spoken.length).toBe(3);
  expect(afterTwo.cancels).toBeGreaterThanOrEqual(2);
});

test('Ctrl+; shows the answer only while held and preserves typed colors (CA3.5)', async ({
  page,
}) => {
  await stubSpeech(page);
  await mockDictionary(page);
  await startSession(page, 'We go home.');

  await page.keyboard.down('Control');
  await page.keyboard.down('Semicolon');
  await expect(page.getByTestId('feedback-revealed')).toBeVisible();
  // No advance: still on word 0, with the ghost preview "we".
  await expectWord(page, 0);
  const slots = page.getByTestId('word-slots');
  await expect(slots.locator('.slot-preview')).toHaveText(['w', 'e']);
  await page.keyboard.up('Semicolon');
  await expect(page.getByTestId('feedback-revealed')).toBeHidden();
  await page.keyboard.up('Control');

  // Only typing the word correctly advances.
  await page.keyboard.type('we');
  await expectWord(page, 1);

  // Reveal on another word: preview shrinks as the user types.
  await page.keyboard.down('Control');
  await page.keyboard.down('Semicolon');
  await expect(slots.locator('.slot-preview')).toHaveText(['g', 'o']);
  await page.keyboard.up('Semicolon');
  await page.keyboard.up('Control');
  await page.keyboard.type('go');
  await expectWord(page, 2);

  await finishSentence(page, ['home'], 2);
  await page.waitForURL('**/result');
  await page.getByTestId('result-next').click();
  await page.waitForURL('**/summary');
  await expect(page.getByTestId('stat-reveals')).toHaveText('2');
});

test('Ctrl+; keeps correct and wrong prefix colors while revealing the remainder', async ({
  page,
}) => {
  await stubSpeech(page);
  await mockDictionary(page);
  await startSession(page, 'with go.');

  await page.keyboard.type('wx');
  const slots = page.getByTestId('word-slots');
  await page.keyboard.down('Control');
  await page.keyboard.down('Semicolon');

  await expect(slots.locator('.slot').nth(0)).toHaveAttribute(
    'data-char-status',
    'correct',
  );
  await expect(slots.locator('.slot').nth(1)).toHaveAttribute(
    'data-char-status',
    'wrong',
  );
  await expect(slots.locator('.slot-preview')).toHaveText(['t', 'h']);

  await page.keyboard.up('Semicolon');
  await page.keyboard.up('Control');
  await expect(slots.locator('.slot-preview')).toHaveCount(0);
});

test('direct /practice without session redirects home (CA1.3)', async ({
  page,
}) => {
  await page.goto('/practice');
  await page.waitForURL(/\/$/);
  await expect(page.getByTestId('home-page')).toBeVisible();
});

test('reload during practice keeps progress (CA1.2)', async ({ page }) => {
  await stubSpeech(page);
  await mockDictionary(page);
  await startSession(page, 'We go home.');

  await finishSentence(page, ['we']);
  await page.reload();

  await expect(page.getByTestId('practice-page')).toBeVisible();
  await expectWord(page, 1);
});

test('layout wraps on a narrow viewport', async ({ page }) => {
  await stubSpeech(page);
  await mockDictionary(page);
  await startSession(page, 'We go home.');
  await finishSentence(page, ['we', 'go', 'home']);
  await page.waitForURL('**/result');
  await expect(page.getByTestId('sentence-area')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(overflow).toBe(true);
});
