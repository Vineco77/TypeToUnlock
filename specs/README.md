# Specs — TypeToUnlock v2 (Listening Typing Challenge)

Nova experiência: o usuário insere um texto em inglês e pratica **escutando** as frases,
digitando palavra por palavra sem ver o texto. Ao final de cada frase, vê a análise
gramatical completa (chunks + POS + IPA) com meanings e pronúncia sob demanda.

## Ordem de entrega

| # | Spec | Entrega |
|---|------|---------|
| 01 | [spec-01-session-flow.md](./spec-01-session-flow.md) | Rotas, divisão em frases e sessão |
| 02 | [spec-02-audio-tts.md](./spec-02-audio-tts.md) | Serviço de áudio (TTS) |
| 03 | [spec-03-typing-challenge.md](./spec-03-typing-challenge.md) | Mecânica de digitação por áudio |
| 04 | [spec-04-language-api.md](./spec-04-language-api.md) | Backend Node: análise gramatical + dicionário |
| 05 | [spec-05-result-view.md](./spec-05-result-view.md) | Tela de resultado com estrutura gramatical |
| 06 | [spec-06-testing.md](./spec-06-testing.md) | Infra de testes (Karma + Playwright) |

## Decisões arquiteturais (aprovadas)

- **Áudio:** Web Speech API (`speechSynthesis`) atrás de uma interface `TtsService`
  (padrão adapter), permitindo trocar a implementação sem refatorar consumidores.
- **Backend:** servidor Node/Express próprio em `server/`, exposto ao Angular via
  `proxy.conf.json` (`/api` → `http://localhost:3000`). Análise gramatical com
  `compromise` (MIT) + heurísticas; dicionário via freedictionaryapi.com com
  fallback para a REST API do Wiktionary; cache em memória.
- **Idioma da UI:** inglês (labels, botões, popups, meanings).
- **Análise de dados externos verificada em 2026-10-10:**
  - `https://freedictionaryapi.com/api/v1/entries/en/{term}` → 200, sem chave,
    IPA + definitions + POS, suporta phrasal verbs (`look up`), CORS reflete o origin.
  - `https://en.wiktionary.org/api/rest_v1/page/definition/{term}` → 200, CORS `*`,
    cobre frases, retorna HTML embutido nas definitions (sanitizar).
  - `api.dictionaryapi.dev` estava indisponível (522) no teste — não é base.
