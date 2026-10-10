# Spec 02 — Serviço de áudio (TTS)

## Objetivo
Disponibilizar áudio para frase inteira, palavra e seleção de palavras, com suporte a
replay instantâneo, usando 100% tecnologia gratuita.

## Escopo
- Interface `TtsService` (padrão adapter) e implementação padrão
  `SpeechSynthesisTts` baseada na **Web Speech API** (`window.speechSynthesis`).
- API do serviço consumida pelos demais módulos:
  - `speak(text, opts?)` — toca `text` (lang `en-US`, rate configurável);
  - `restart(text, opts?)` — se já estiver tocando, para e toca `text` do início;
    senão, apenas toca;
  - `cancel()` — para qualquer reprodução;
  - `isSpeaking$` — estado para a UI (ex.: animação de "listening").
- Seleção da melhor voz inglesa disponível no SO (preferir vozes `en-US`/`en-GB`
  do sistema); voz pode ser configurada posteriormente.

## Requisitos
- **R2.1** `Ctrl+.` na página de prática toca a frase inteira; se o áudio já estiver
  tocando, reinicia desde o início da frase.
- **R2.2** No resultado, o popup de seleção toca apenas a palavra/seleção (palavra
  única ou várias palavras na ordem da frase).
- **R2.3** O serviço só é instanciado em browser (SSR não quebra); em servidor fica
  no-op silencioso.
- **R2.4** Fallback: se `speechSynthesis` não existir, a UI exibe aviso "Audio not
  supported in this browser" e o desafio continua inaudível com aviso visível
  (Ctrl+; revelar permanece disponível).

## Critérios de aceite
- **CA2.1** Três `Ctrl+.` consecutivos tocam a frase 3×, sempre do início.
- **CA2.2** `restart()` durante reprodução interrompe a atual e começa nova do zero.
- **CA2.3** `ng build` (SSR) e `ng serve` não lançam erro de `window is not defined`.
- **CA2.4** Nenhum custo/chave de API: nada de rede para áudio (Web Speech API local).

## Dependências
- Web Speech API do navegador (sem dependências npm).
- Injeção via `TTS_TOKEN` (interface) para permitir mock nos testes e troca futura
  (ex.: StreamElements/Google TTS) sem tocar consumidores.

## Testes
- Unitários (Karma): `SpeechSynthesisTts` com `speechSynthesis` mockado —
  `speak` chama `speak()` uma vez; `restart` chama `cancel()` antes de `speak()`;
  injeção de voz en-US.
- E2E (Playwright): via `addInitScript`, injeta um stub de `speechSynthesis` que grava
  as chamadas; verifica que `Ctrl+.` registra `cancel()+speak(frase)` ao tocar duas vezes.
