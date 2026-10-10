# Spec 05 — Tela de resultado (estrutura gramatical)

## Objetivo
Ao terminar todas as palavras da frase, exibir a frase completa com a estrutura de
análise gramatical (conforme o print de referência): chunks em caixas com badge no
topo, IPA acima de cada palavra, POS abaixo, e um popup de meaning + pronúncia para
qualquer seleção com o mouse — tudo em inglês.

## Escopo
- Componente de página `/result` consumindo `POST /api/analyze` e `GET /api/dictionary`.
- Layout por chunks: badge do chunk (`Subject`, `Verb`, `Prepositional phrase`,
  `phrasal verb`, `Object`…) no topo da caixa, palavra grande no meio, sublinhado
  colorido por palavra, IPA (`/nɪd/`) acima e POS (`verb`, `noun`, `adjective`…)
  abaixo de cada palavra.
- Detecção de seleção com o mouse (uma ou mais palavras, inclusive atravessando
  chunks) e popup flutuante.

## Requisitos
- **R5.1** A frase é renderizada por chunks na ordem original; cada palavra mostra IPA
  acima (quando disponível) e POS abaixo (labels em inglês, minúsculas como no print).
- **R5.2** IPA é resolvido por palavra via `/api/dictionary`, com cache; palavra sem
  entrada não exibe IPA (não quebra o layout).
- **R5.3** Selecionar com o mouse (drag) uma ou mais palavras abre o popup com:
  - meaning em inglês da **seleção inteira** quando existe entrada para a frase
    (ex.: phrasal verb `look up` → meaning do phrasal verb);
  - fallback: meanings das palavras individuais empilhados;
  - botão 🔊 que toca **somente a seleção** via `TtsService` (palavra única → uma
    palavra; várias → na ordem da frase).
- **R5.4** O popup fecha ao clicar fora ou pressionar `Esc`; selecionar de novo
  reabre com a nova seleção.
- **R5.5** Loading discreto enquanto o dicionário responde; falha de rede mostra
  "Meaning not available" sem quebrar a tela.
- **R5.6** Ações da tela: "Listen" (frase inteira), "Next sentence" (spec-01) e
  contadores de stats da frase (erros, hints usados).
- **R5.7** Tema escuro próximo ao print (caixas arredondadas com borda colorida por
  chunk, tipografia grande para palavras).

## Critérios de aceite
- **CA5.1** Frase `We need to reconnect with former customers.` renderiza 3 chunks
  (Subject / Verb / Prepositional phrase) com IPA acima e POS abaixo de cada palavra.
- **CA5.2** Selecionar só `former` → popup com meaning de `former` + pronúncia da
  palavra; selecionar `former customers` → popup com meaning da seleção + áudio das
  duas palavras (duas falas na ordem).
- **CA5.3** Selecionar um phrasal verb de 2 palavras (ex.: `look up`) → popup com o
  meaning do phrasal verb e áudio das 2 palavras.
- **CA5.4** `Esc`/clique fora fecha o popup; nova seleção reabre atualizado.
- **CA5.5** Palavra sem entrada no dicionário: layout continua íntegro, popup mostra
  fallback/mensagem, sem erros no console.
- **CA5.6** Toda a UI desta tela em inglês.

## Dependências
- API do spec-04 (`/api/analyze`, `/api/dictionary`), `TtsService` (spec-02),
  `SessionService` (spec-01).
- Angular CDK não é obrigatório: implementar seleção com `mouseup`/`selectionchange`
  nativo.

## Testes
- Unitários (Karma): mapeamento análise→view-model, detecção de intervalo de seleção
  (índices de palavra), montagem do popup (seleção única vs múltipla vs fallback),
  sanitização do que vem do dicionário.
- E2E (Playwright): frase concluída → `/result` com chunks/IPA/POS; selecionar palavra
  → popup com meaning e chamada de áudio registrada (stub do spec-02); `Esc` fecha.
