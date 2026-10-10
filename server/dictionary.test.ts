import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookupTerm, stripHtml, type FetchLike } from './dictionary';

function fakeFetch(routes: Record<string, unknown>): FetchLike {
  return async (url: string) => {
    const body = routes[url];
    if (body === undefined) {
      return { ok: false, status: 404, json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => body };
  };
}

const FREE_API = 'https://freedictionaryapi.com/api/v1/entries/en/';
const WIKI_API = 'https://en.wiktionary.org/api/rest_v1/page/definition/';

test('stripHtml removes tags and decodes entities', () => {
  assert.equal(
    stripHtml('<span class="x">To <a href="#">connect</a> &amp; more</span>'),
    'To connect & more',
  );
});

test('parses freedictionaryapi responses (IPA + definitions)', async () => {
  const fetchImpl = fakeFetch({
    [`${FREE_API}reconnect`]: {
      word: 'reconnect',
      entries: [
        {
          partOfSpeech: 'verb',
          pronunciations: [{ type: 'ipa', text: '/ˌɹiː.kəˈnɛkt/' }],
          senses: [
            { definition: 'To connect again.', examples: ['They reconnected.'] },
          ],
        },
      ],
    },
  });

  const result = await lookupTerm('reconnect', fetchImpl);
  assert.ok(result);
  assert.equal(result.source, 'freedictionaryapi');
  assert.equal(result.phonetic, '/ˌɹiː.kəˈnɛkt/');
  assert.equal(result.partOfSpeech, 'verb');
  assert.equal(result.definitions[0].text, 'To connect again.');
  assert.equal(result.definitions[0].example, 'They reconnected.');
});

test('falls back to Wiktionary and sanitizes HTML (CA4.2)', async () => {
  const fetchImpl = fakeFetch({
    [`${WIKI_API}look%20up`]: {
      en: [
        {
          partOfSpeech: 'Verb',
          definitions: [
            {
              definition: '<span>Used other than figuratively:</span> <i>see</i> look.',
              examples: ['We <b>looked it up</b>.'],
            },
          ],
        },
      ],
    },
  });

  const result = await lookupTerm('look up', fetchImpl);
  assert.ok(result);
  assert.equal(result.source, 'wiktionary');
  assert.equal(result.partOfSpeech, 'verb');
  assert.equal(
    result.definitions[0].text,
    'Used other than figuratively: see look.',
  );
  assert.equal(result.definitions[0].example, 'We looked it up.');
});

test('combines per-word meanings for unknown phrases (R4.3)', async () => {
  const wordEntry = (definition: string) => ({
    entries: [
      {
        partOfSpeech: 'noun',
        pronunciations: [],
        senses: [{ definition }],
      },
    ],
  });
  const fetchImpl = fakeFetch({
    [`${FREE_API}former`]: wordEntry('One that came before.'),
    [`${FREE_API}customers`]: wordEntry('A buyer of goods or services.'),
  });

  const result = await lookupTerm('former customers', fetchImpl);
  assert.ok(result);
  assert.equal(result.partOfSpeech, 'literal translation');
  assert.equal(result.definitions.length, 2);
  assert.match(result.definitions[0].text, /^former: /);
  assert.match(result.definitions[1].text, /^customers: /);
});

test('returns null when no source has the term (CA4.4)', async () => {
  const fetchImpl = fakeFetch({});
  const result = await lookupTerm('zzzzqqq', fetchImpl);
  assert.equal(result, null);
});

test('empty term short-circuits without network', async () => {
  let called = false;
  const fetchImpl: FetchLike = async () => {
    called = true;
    return { ok: false, status: 500, json: async () => ({}) };
  };
  assert.equal(await lookupTerm('   ', fetchImpl), null);
  assert.equal(called, false);
});
