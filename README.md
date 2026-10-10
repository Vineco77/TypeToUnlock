# TypeToUnlock

Practice English **listening + writing**: paste an English text, hear each
sentence and type it word by word — the only hints are the audio, the word
length ("bottom lines") and the per-character feedback. At the end of each
sentence, see its full grammatical analysis with meanings and pronunciation.

## How it works

1. **`/`** — paste an English text (it is split into sentences).
2. **`/practice`** — listen to the sentence (plays automatically once) and type
   each word without seeing it:
   - correct word → **green** and you automatically advance;
   - wrong word → the **divergent characters turn red** and the input locks
     until you fix the same word;
   - `Ctrl+.` → replay the sentence (restarts it if already playing);
   - `Ctrl+;` → reveal the current word (amber, counted as a hint).
3. **`/result`** — the full sentence as grammatical chunks (Subject, Verb,
   Phrasal verb, Prepositional phrase, Object, ...), IPA above each word, POS
   below it. Select one or more words with the mouse to open a popup with the
   **meaning** and listen to **only that selection**.
4. **`/summary`** — session stats with per-sentence review links.

## Development setup

```bash
npm install

# API server (port 3000) + Angular dev server (port 4200, /api proxied)
npm run dev
# or separately:
npm run dev:server   # Node API
npm start            # ng serve with /api proxy
```

Open http://localhost:4200.

## Tests

```bash
# Unit tests (frontend, Karma/Jasmine — 34 specs)
npm test

# Unit tests (server, node:test — 12 specs)
npm run test:server

# E2E (Playwright — 13 tests, boots both servers automatically)
npx playwright install chromium   # first time only
npm run e2e

# Everything at once
npm run test:all
```

E2E and server tests are fully deterministic: `speechSynthesis` is stubbed and
dictionary responses come from fixtures (no external network in tests).

## Free stack (no API keys, no costs)

| Need | Solution |
|---|---|
| Audio (sentence/word/selection) | **Web Speech API** (`speechSynthesis`) behind a `TtsService` adapter |
| POS tagging / chunks | **compromise** (MIT) + heuristic chunker on `server/` |
| Meanings + IPA | **freedictionaryapi.com** with **Wiktionary REST** fallback, cached 24h |

## Specs

Each delivery of this experience is documented in [`specs/`](./specs/README.md)
with goal, scope, requirements, acceptance criteria, dependencies and tests.
