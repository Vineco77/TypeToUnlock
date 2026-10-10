# Spec 04 — Backend Node: análise gramatical + dicionário

## Objetivo
Expor uma API Node/Express gratuita e auto-hospedada que devolve, para cada frase do
texto: POS por palavra, chunks gramaticais (estrutura da frase) e significado/IPA sob
demanda para o popup do resultado.

## Escopo
- Servidor Node/Express próprio em `server/` (TypeScript), porta 3000.
- `POST /api/analyze` — análise gramatical de um texto.
- `GET /api/dictionary?term=` — meaning + IPA de palavra ou frase.
- Proxy do Angular dev-server (`proxy.conf.json`) e integração no build.
- Cache em memória (TTL) para ambas as rotas.

## Requisitos
- **R4.1** `POST /api/analyze { "text": "..." }` retorna:
  ```json
  {
    "sentences": [{
      "text": "...",
      "words": [{ "index": 0, "text": "We", "pos": "pronoun", "phonetic": "/wi/" }],
      "chunks": [{ "label": "Subject", "start": 0, "end": 0 }]
    }]
  }
  ```
  - POS por palavra via `compromise` (MIT): mapping para `noun, verb, adjective,
    pronoun, determiner, preposition, adverb, conjunction, other` (alvo do print).
  - Chunks raso por heurística sobre os POS: `Subject`, `Verb phrase` (incluindo
    `phrasal verb` quando verbo+partícula), `Prepositional phrase`, `Object`,
    `Adverbial phrase` — sem sobreposição, cobrindo a frase inteira (fallback:
    chunk `Sentence` quando a heurística não se aplica).
  - `phonetic` (IPA) é opcional e resolvido sob demanda pelo dicionário (spec-05).
- **R4.2** `GET /api/dictionary?term=reconnect` → meaning em inglês + IPA, fonte:
  1) `https://freedictionaryapi.com/api/v1/entries/en/{term}` (sem chave);
  2) fallback `https://en.wiktionary.org/api/rest_v1/page/definition/{term}`
     (sanitizar HTML das definitions).
  Resposta: `{ "term", "phonetic", "partOfSpeech", "definitions": [{ "text", "example?" }] }`.
- **R4.3** Termos multi-palavra (phrasal verbs, seleções): primeiro tenta o termo
  completo (`look up`); se 404, concatena os resultados palavra a palavra com
  rótulo "literal translation" — nunca um erro fatal.
- **R4.4** Rate limit amigável ao upstream (cache TTL 24h por termo normalizado,
  requisições da mesma frase deduplicadas) e timeout de 10s com 504.
- **R4.5** Erros respondem JSON `{ "error": "..." }` com status adequado (400 input
  inválido/vazio, 404 termo sem entrada em ambas as fontes, 504 timeout upstream).
- **R4.6** Angular dev: `proxy.conf.json` mapeia `/api` → `http://localhost:3000`;
  scripts npm `dev:server` (tsx watch) e `dev` (concurrently com ng serve).

## Critérios de aceite
- **CA4.1** `We need to reconnect with former customers.` retorna chunks coerentes
  (Subject; Verb phrase; Prepositional phrase) cobrindo 100% das palavras, sem
  sobreposição, e POS por palavra preenchido.
- **CA4.2** `GET /api/dictionary?term=look+up` retorna definitions do phrasal verb
  (fonte Wiktionary) e nunca 5xx.
- **CA4.3** Segunda chamada do mesmo termo é servida do cache (< 50ms, sem rede).
- **CA4.4** Termo inexistente em ambas as fontes → 404 com JSON de erro amigável.
- **CA4.5** `POST /api/analyze` com texto vazio → 400.
- **CA4.6** O app Angular em dev consome a API via proxy (sem CORS no browser).

## Dependências
- `express`, `compromise` (14.x, MIT), `tsx` (dev), `cors` (opcional/evitar via proxy).
- Fontes externas gratuitas: freedictionaryapi.com, en.wiktionary.org REST.

## Testes
- Unitários (Jasmine/Karma do server ou vitest/jest do server — definir em impl.):
  mapping POS→label, heuristic chunker (frases cobertas, sem sobreposição, phrasal
  verb detectado), parsing das respostas das duas fontes de dicionário (fixtures).
- Integração (supertest): `/api/analyze` (200/400), `/api/dictionary` (200 cache,
  404, fallback entre fontes com upstream mockado).
- E2E (Playwright): fluxo real com o servidor rodando — analisar frase e consultar
  termo do popup.
