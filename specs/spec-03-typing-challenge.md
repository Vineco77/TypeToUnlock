# Spec 03 — Mecânica de digitação por áudio (core)

## Objetivo
O coração da experiência: o usuário ouve a frase e digita palavra por palavra sem ver
o texto; a única pista é o áudio, o tamanho da palavra e o feedback visual de acerto/erro.

## Escopo
- Motor de digitação por palavra (estado, comparação, feedback).
- Renderização visual do tamanho da palavra ("bottom lines" — um sublinhado por caractere).
- Atalhos `Ctrl+.` (replay da frase) e `Ctrl+;` (revelar palavra atual).
- Componente de página `/practice` (substitui o comportamento do antigo `word-display`).

## Requisitos
- **R3.1** A palavra-alvo nunca é exibida; a pista visual é um sublinhado por caractere
  (ex.: `with` → `_ _ _ _`), sem número nem texto da palavra.
- **R3.2** Avaliação automática a cada tecla — **sem Enter**: quando o texto digitado
  atinge o comprimento do alvo, a palavra é avaliada.
- **R3.3** Comparação case-insensitive e ignorando pontuação/acentos (requisito
  não-funcional: sem validação desses casos).
- **R3.4** Certo → a palavra fica **verde** e o sistema avança automaticamente para a
  próxima palavra (sem pressionar nada).
- **R3.5** Errado → **apenas os caracteres divergentes** ficam **vermelhos** (comparação
  posicional); o input trava — não aceita mais teclas além do comprimento do alvo —
  e o usuário deve apagar (Backspace) e corrigir **a mesma palavra**. Ex.: alvo `with`,
  digitado `wifi` → `w`,`i` neutros, `f`,`i` vermelhos, sem avanço.
- **R3.6** A correção reavalia a cada tecla: ao corrigir para o valor exato, fica
  verde e avança.
- **R3.7** `Ctrl+.` toca/reinicia o áudio da frase inteira (spec-02).
- **R3.8** `Ctrl+;` **exibe a resposta da palavra atual** — os caracteres ainda não
  digitados aparecem como "ghost text" (âmbar) e o word slots ficam com borda âmbar.
  **Não avança automaticamente**: o usuário continua precisando digitar a palavra
  corretamente para avançar (verde → próximo). Cada uso é contabilizado como hint
  nas stats.
- **R3.9** Barra de progresso por frase (palavras concluídas/total).
- **R3.10** Ao concluir todas as palavras da frase, a sessão avança para `/result`
  (spec-05) automaticamente.
- **R3.11** Ao iniciar cada frase, o áudio toca automaticamente uma vez (bomUX) e
  permanece disponível por `Ctrl+.`.

## Critérios de aceite
- **CA3.1** Alvo `with`: digitar `wifi` → `f`,`i` em vermelho, cursor travado na
  posição 4, sem avanço; apagar 2× e digitar `th` → palavra completa verde e avanço.
- **CA3.2** Digitar `WITH` ou `With` para alvo `with` → verde e avanço.
- **CA3.3** Alvo `customers,` (vírgula no token original): digitar `customers` → verde
  (pontuação ignorada na comparação).
- **CA3.4** Nenhum momento a palavra-alvo aparece no DOM da página de prática
  (verificação E2E por `page.content()`).
- **CA3.5** `Ctrl+;` na primeira palavra mostra o preview âmbar e **continua na mesma
  palavra** (índice não muda); digitar a palavra corretamente avança para a próxima.
  Dois `Ctrl+;` + digitação correta incrementam "hints used" para 2 no resumo.
- **CA3.6** Tecla extra além do comprimento do alvo é ignorada (não insere caractere).

## Dependências
- `TypingEngine` (novo, puro e testável): recebe palavra-alvo, entrada de tecla e
  emite estado `{ chars: [{char, status}], status: 'typing'|'wrong'|'correct'|'revealed' }`.
- `TtsService` (spec-02), `SessionService` (spec-01).

## Testes
- Unitários (Karma) do `TypingEngine`: matrizes de casos (certo, errado parcial,
  trava no comprimento, backspace destrava, case-insensitive, pontuação ignorada,
  reveal avança, caracteres extras ignorados).
- E2E (Playwright) do fluxo: digitar corretamente 2 palavras → verde/avanço; errar →
  vermelho → apagar → corrigir; `Ctrl+;` revela; concluir frase redireciona a `/result`.
