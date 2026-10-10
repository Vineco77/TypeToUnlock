import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeText, chunkWords, mapPos, splitSentences } from './analyze';
import type { ChunkAnalysis, WordAnalysis } from '../src/app/core/models';

test('splitSentences mirrors the frontend rule', () => {
  assert.deepEqual(splitSentences('One. Two? Three!'), ['One.', 'Two?', 'Three!']);
  assert.deepEqual(splitSentences(''), []);
});

test('mapPos maps compromise tags to the app vocabulary', () => {
  assert.equal(mapPos(['Noun', 'Pronoun'], 'we'), 'pronoun');
  assert.equal(mapPos(['Determiner'], 'the'), 'determiner');
  assert.equal(mapPos(['Connector', 'Preposition'], 'with'), 'preposition');
  assert.equal(mapPos(['Adjective'], 'former'), 'adjective');
  assert.equal(mapPos(['Verb', 'PresentTense'], 'need'), 'verb');
  assert.equal(mapPos(['Noun', 'Plural'], 'customers'), 'noun');
  assert.equal(mapPos(['Expression'], 'please'), 'other');
});

test('analyzeText covers the reference sentence (CA4.1)', () => {
  const { sentences } = analyzeText('We need to reconnect with former customers.');
  assert.equal(sentences.length, 1);
  const [sentence] = sentences;

  // words carry the original token with punctuation attached
  assert.equal(sentence.words[sentence.words.length - 1].text, 'customers.');
  assert.equal(sentence.words[sentence.words.length - 1].base, 'customers');

  // POS per word is filled
  assert.ok(sentence.words.every((w) => w.pos.length > 0));

  const labels = sentence.chunks.map((c) => c.label);
  assert.deepEqual(labels, ['Subject', 'Verb', 'Preposial phrase'].map(
    (l) => (l === 'Preposial phrase' ? 'Prepositional phrase' : l),
  ));

  // Subject covers "We"
  assert.deepEqual([sentence.chunks[0].start, sentence.chunks[0].end], [0, 0]);
  // Verb covers "need to reconnect"
  assert.deepEqual([sentence.chunks[1].start, sentence.chunks[1].end], [1, 3]);
  // Prepositional phrase covers "with former customers."
  assert.deepEqual([sentence.chunks[2].start, sentence.chunks[2].end], [4, 6]);
});

test('chunks are ordered, contiguous and cover every word (CA4.1)', () => {
  const samples = [
    'The quick brown fox jumps over the lazy dog.',
    'Please look up the number and call them back.',
    'She gave him the book yesterday.',
    'We are going to the store.',
  ];
  for (const text of samples) {
    for (const sentence of analyzeText(text).sentences) {
      assertCoverage(sentence.words, sentence.chunks);
    }
  }
});

test('detects a phrasal verb with an explicit particle', () => {
  const { sentences } = analyzeText('Please look up the number.');
  const [sentence] = sentences;
  const phrasal = sentence.chunks.find((c) => c.label === 'Phrasal verb');
  assert.ok(phrasal, 'expected a Phrasal verb chunk');
  assert.equal(sentence.words[phrasal.start].base, 'look');
  assert.equal(sentence.words[phrasal.end].base, 'up');
});

test('analyzeText splits a paragraph into multiple sentences', () => {
  const { sentences } = analyzeText('First sentence here. Second one right here!');
  assert.equal(sentences.length, 2);
});

function assertCoverage(words: WordAnalysis[], chunks: ChunkAnalysis[]): void {
  assert.ok(chunks.length > 0);
  let cursor = 0;
  for (const chunk of chunks) {
    assert.equal(chunk.start, cursor, 'chunks must be contiguous');
    assert.ok(chunk.end >= chunk.start);
    cursor = chunk.end + 1;
  }
  assert.equal(cursor, words.length, 'chunks must cover all words');
}
