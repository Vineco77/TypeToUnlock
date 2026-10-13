# Spec 07 — Seletor de dificuldade (Normal / Easy)

## Objetivo
Permitir que o usuário escolha, antes de começar o desafio, entre o nível
**Normal** (áudio puro, comportamento atual da spec-03) e o nível **Easy**, em
que a frase sendo praticada é exibida abaixo do desafio e pode ser censurada
com um toggle de olho.

## Escopo
- Seletor de dificuldade (toggle segmentado) no canto superior esquerdo da home.
- Persistência do nível junto da sessão em `sessionStorage`.
- Indicador (badge) do nível ativo na página de prática.
- Painel com a frase sendo praticada no nível Easy, com botão de olho.

## Requisitos
- **R7.1** A home exibe um toggle visual com os níveis `Normal` e `Easy` no
  topo esquerdo; o padrão é `Normal`.
- **R7.2** O nível só pode ser alterado **antes** de iniciar o desafio: o
  seletor existe apenas na home; na prática há somente um badge indicativo.
- **R7.3** O nível escolhido é gravado junto da sessão em `sessionStorage`
  (`SessionState.difficulty`); recarregar em `/practice` mantém o nível atual.
  Criar uma nova sessão a partir da home volta ao padrão `Normal`.
- **R7.4** Sessões antigas sem `difficulty` são restauradas como `Normal`.
- **R7.5** No nível Easy, a frase sendo praticada é exibida por completo abaixo
  do desafio, uma frase por vez (a frase atual), em inglês.
- **R7.6** O painel Easy tem um botão de olho que alterna a visibilidade:
  - visível: mostra o texto da frase; ícone de olho aberto (`👁`);
  - oculto: censura o texto (todo caractere não-espaço vira `•`) e troca o
    ícone (`🙈`).
- **R7.7** O nível Normal mantém integralmente a regra R3.1/CA3.4: nenhum
  momento o alvo aparece no DOM da página de prática.
- **R7.8** Atalhos `Ctrl+.` (replay) e `Ctrl+;` (hint) continuam valendo nos
  dois níveis.

## Critérios de aceite
- **CA7.1** Por padrão o toggle inicia em `Normal` e a prática não mostra o painel Easy.
- **CA7.2** Selecionar `Easy`, iniciar o desafio e a página de prática exibe o
  badge `Easy` e a frase atual abaixo do desafio.
- **CA7.3** Clicar no olho censura a frase (`•• •• •••••` para `We go home.`) e
  troca o ícone; clicar de novo volta a exibir o texto.
- **CA7.4** Recarregar em `/practice` mantém o nível `Easy` e a frase exibida.
- **CA7.5** Avançar para a próxima frase atualiza o texto exibido para a nova frase.
- **CA7.6** Voltar à home e criar outra sessão reinicia em `Normal`.
- **CA7.7** No nível Normal o painel Easy não existe no DOM (CA3.4 preservado).
- **CA7.8** O seletor de dificuldade não existe na página de prática.

## Dependências
- `Difficulty` (`core/models.ts`) e `SessionService` (spec-01) para persistência.
- `PracticePageComponent` (spec-03) para o badge e o painel Easy.

## Testes
- Unitários (Karma): `SessionService` — padrão `Normal`, criação com `easy`
  persistida/restaurada, sessão legada sem `difficulty` restaurada como `Normal`.
- E2E (Playwright, `e2e/difficulty.spec.ts`): padrão Normal sem revelar o alvo;
  Easy com frase visível e censura pelo olho; nível mantido após reload; frase
  acompanha a sessão; nova sessão volta a Normal.
