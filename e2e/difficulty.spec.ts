import { test, expect, Page } from '@playwright/test';
import { mockDictionary, startSession, stubSpeech } from './helpers';

/** Waits until the practice page is ready for word `index` (see
 * session-flow.spec.ts): the index is updated and the previous word's
 * typed characters were cleared when the new engine started. */
async function expectWord(page: Page, index: number): Promise<void> {
  const slots = page.getByTestId('word-slots');
  await expect(slots).toHaveAttribute('data-word-index', String(index));
  await expect(
    slots.locator('[data-char-status="correct"], [data-char-status="wrong"]'),
  ).toHaveCount(0);
}

/**
 * spec-07 end-to-end: difficulty is chosen on the home page (Normal by
 * default), only changeable before the challenge starts. On Easy the
 * sentence being practiced is shown below the challenge and can be
 * censored with the eye toggle; on Normal nothing is revealed (CA3.4).
 */

test('normal is the default and never exposes the practiced sentence', async ({
  page,
}) => {
  await stubSpeech(page);
  await mockDictionary(page);
  await startSession(page, 'We go home.', 'normal');

  await expect(page.getByTestId('difficulty-badge')).toHaveText('Normal');
  await expect(page.getByTestId('easy-panel')).toHaveCount(0);
  // The difficulty selector is only on the home page, never during the run.
  await expect(page.getByTestId('difficulty-toggle')).toHaveCount(0);

  // CA3.4: the target word is never in the DOM on the Normal level.
  const pageContent = await page.content();
  expect(pageContent).not.toContain('home');
});

test('easy mode shows the practiced sentence and the eye toggle censors it', async ({
  page,
}) => {
  await stubSpeech(page);
  await mockDictionary(page);
  await startSession(page, 'We go home.', 'easy');

  // Badge indicates the active level during the challenge.
  await expect(page.getByTestId('difficulty-badge')).toHaveText('Easy');
  await expect(page.getByTestId('difficulty-toggle')).toHaveCount(0);

  // The sentence being practiced is visible below the challenge.
  const sentence = page.getByTestId('easy-sentence');
  await expect(sentence).toHaveText('We go home.');

  // Eye toggle off: the icon changes and the sentence is censored.
  const eye = page.getByTestId('sentence-visibility-toggle');
  await expect(eye).toHaveAttribute('aria-pressed', 'true');
  await eye.click();
  await expect(eye).toHaveAttribute('aria-pressed', 'false');
  await expect(sentence).toHaveText('•• •• •••••');

  // Eye toggle on again: readable once more.
  await eye.click();
  await expect(sentence).toHaveText('We go home.');
});

test('easy mode keeps the level, the sentence and progress after a reload', async ({
  page,
}) => {
  await stubSpeech(page);
  await mockDictionary(page);
  await startSession(page, 'We go home.', 'easy');

  await page.keyboard.type('we');
  await page.reload();

  await expect(page.getByTestId('difficulty-badge')).toHaveText('Easy');
  await expect(page.getByTestId('easy-sentence')).toHaveText('We go home.');
});

test('easy mode follows the current sentence across the session', async ({
  page,
}) => {
  await stubSpeech(page);
  await mockDictionary(page);
  await startSession(page, 'We go home. They run fast.', 'easy');

  await expect(page.getByTestId('easy-sentence')).toHaveText('We go home.');
  await expectWord(page, 0);
  await page.keyboard.type('we');
  await expectWord(page, 1);
  await page.keyboard.type('go');
  await expectWord(page, 2);
  await page.keyboard.type('home');
  await page.waitForURL('**/result');

  await page.getByTestId('result-next').click();
  await page.waitForURL('**/practice');
  await expect(page.getByTestId('sentence-counter')).toContainText(
    'Sentence 2 of 2',
  );
  await expect(page.getByTestId('easy-sentence')).toHaveText('They run fast.');
});

test('a new session from the home page resets the difficulty to Normal', async ({
  page,
}) => {
  await stubSpeech(page);
  await mockDictionary(page);
  await startSession(page, 'We go home.', 'easy');
  await expect(page.getByTestId('difficulty-badge')).toHaveText('Easy');

  // Back on the home page the selector defaults to Normal again (spec-07).
  await page.goto('/');
  await expect(page.getByTestId('difficulty-normal')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await startSession(page, 'We go home.', 'normal');
  await expect(page.getByTestId('difficulty-badge')).toHaveText('Normal');
  await expect(page.getByTestId('easy-panel')).toHaveCount(0);
});
