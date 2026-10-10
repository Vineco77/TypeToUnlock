import { test, expect, Page, Locator } from '@playwright/test';
import { mockDictionary, startSession, stubSpeech, ttsLog } from './helpers';

/**
 * spec-05 E2E: selection popup with meanings and per-selection audio.
 * Uses real mouse events (dblclick / drag) so the browser creates a native
 * selection, exactly like a real user (CA5.2–CA5.5).
 */

async function finishSentence(page: Page, words: string[]): Promise<void> {
  for (let i = 0; i < words.length; i++) {
    const slots = page.getByTestId('word-slots');
    await expect(slots).toHaveAttribute('data-word-index', String(i));
    await expect(slots.locator('[data-char-status]')).toHaveCount(0);
    await page.keyboard.type(words[i]);
  }
}

async function selectWord(page: Page, word: Locator): Promise<void> {
  const box = await word.boundingBox();
  if (!box) throw new Error('word not visible');
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
}

/** Drags from the middle of word A to the middle of word B. */
async function selectRange(
  page: Page,
  first: Locator,
  last: Locator,
): Promise<void> {
  const from = await first.boundingBox();
  const to = await last.boundingBox();
  if (!from || !to) throw new Error('words not visible');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
}

test('select a single word: meaning + pronunciation popup (CA5.2)', async ({
  page,
}) => {
  await stubSpeech(page);
  await mockDictionary(page);
  await startSession(page, 'Please look up the word.');
  await finishSentence(page, ['please', 'look', 'up', 'the', 'word']);
  await page.waitForURL('**/result');

  // "look" is word index 1.
  await selectWord(page, page.locator('[data-word-index="1"] .word-text'));

  const popup = page.getByTestId('meaning-popup');
  await expect(popup).toBeVisible();
  await expect(popup.locator('.popup-term')).toHaveText('look');
  await expect(page.getByTestId('popup-definitions')).toContainText(
    'mock meaning of look',
  );

  // CA5.2: the popup plays only the selection.
  await page.getByTestId('popup-listen').click();
  const log = await ttsLog(page);
  expect(log.spoken[log.spoken.length - 1]).toBe('look');
});

test('selecting a phrasal verb plays both words (CA5.3)', async ({ page }) => {
  await stubSpeech(page);
  await mockDictionary(page);
  await startSession(page, 'Please look up the word.');
  await finishSentence(page, ['please', 'look', 'up', 'the', 'word']);
  await page.waitForURL('**/result');

  await selectRange(
    page,
    page.locator('[data-word-index="1"] .word-text'),
    page.locator('[data-word-index="2"] .word-text'),
  );

  const popup = page.getByTestId('meaning-popup');
  await expect(popup).toBeVisible();
  await expect(popup.locator('.popup-term')).toHaveText('look up');

  await page.getByTestId('popup-listen').click();
  const log = await ttsLog(page);
  expect(log.spoken[log.spoken.length - 1]).toBe('look up');
});

test('Esc closes the popup (CA5.4)', async ({ page }) => {
  await stubSpeech(page);
  await mockDictionary(page);
  await startSession(page, 'Please look up the word.');
  await finishSentence(page, ['please', 'look', 'up', 'the', 'word']);
  await page.waitForURL('**/result');

  await selectWord(page, page.locator('[data-word-index="0"] .word-text'));
  await expect(page.getByTestId('meaning-popup')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('meaning-popup')).toHaveCount(0);
});

test('dictionary 404 shows "Meaning not available" (CA5.5)', async ({
  page,
}) => {
  await stubSpeech(page);
  await mockDictionary(page, { status: 404 });
  await startSession(page, 'Please look up the word.');
  await finishSentence(page, ['please', 'look', 'up', 'the', 'word']);
  await page.waitForURL('**/result');

  await selectWord(page, page.locator('[data-word-index="0"] .word-text'));
  await expect(page.getByTestId('popup-failed')).toBeVisible();
});
