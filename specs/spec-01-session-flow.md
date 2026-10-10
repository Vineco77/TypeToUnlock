# Spec 01 — Fluxo de sessão e rotas

## Objetivo
Estruturar o fluxo da nova experiência: entrada de texto em inglês → desafio de digitação
por áudio frase a frase → tela de resultado analisado → próxima frase → resumo final,
com a sessão persistida entre navegações.

## Escopo
- Definição das rotas e componentes de página.
- Split do texto de entrada em frases (tokens de prática).
- Estado global da sessão (frase atual, progresso, stats) e sua persistência.
- Substituição do fluxo antigo (componente `word-display` com palavra visível) pelo
  novo fluxo por áudio.

## Requisitos
- **R1.1** A rota `/` exibe o input de texto em inglês (textarea + botão "Start").
- **R1.2** Ao enviar, o texto é dividido em frases (separadores `.`, `!`, `?` e
  quebras de linha; frases vazias descartadas) e a sessão é criada em `/practice`.
- **R1.3** A sessão guarda: lista de frases, índice da frase atual, estado por palavra
  (pending/revealed/correct), stats (erros, reveals — usos do Ctrl+; — e palavras) e é
  persistida em `sessionStorage` (guard `isPlatformBrowser` por causa do SSR).
  Nota: `revealed` marca que a resposta foi exibida via Ctrl+; nesta palavra; a
  transição para `correct` só acontece quando o usuário a digita.
- **R1.4** Cada frase concluída leva a `/result` (análise gramatical); "Next sentence"
  avança para a próxima frase em `/practice`, ou ao resumo final quando não há mais frases.
- **R1.5** O resumo final lista todas as frases com link para revisar cada análise.
- **R1.6** Acessar `/practice` ou `/result` sem sessão redireciona para `/`.

## Critérios de aceite
- **CA1.1** Texto com 3 frases gera 3 rodadas; a UI mostra "Sentence 1 of 3".
- **CA1.2** Reload do navegador em `/practice` mantém a frase e o progresso atual.
- **CA1.3** Trocar a rota manualmente para `/practice` sem sessão redireciona a `/`.
- **CA1.4** Completar a última frase exibe o resumo final, sem rotas quebradas.
- **CA1.5** O build SSR não lança erro (nada de `window`/`sessionStorage` no servidor).

## Dependências
- Angular Router, `isPlatformBrowser` (`@angular/common`).
- `SessionService` (novo) — substitui o estado de `TextProcessingService`.

## Testes
- Unitários (Karma): `SentenceSplitterService` (pontuação, múltiplas frases, edge cases:
  texto sem pontuação, espaços extras, letras maiúsculas/minúsculas) e
  `SessionService` (criar/serializar/restaurar sessão, redirecionamento sem sessão).
- E2E (Playwright): submeter texto de 2 frases → `/practice` → completar → `/result` →
  próxima frase → resumo; reload mantém estado; rota direta sem sessão redireciona.
