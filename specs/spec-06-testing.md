# Spec 06 — Infra de testes (Karma + Playwright)

## Objetivo
Garantir a evolução da nova experiência com uma suíte de testes reproduzível:
unidades rápidas com Karma/Jasmine (já existente) e E2E reais com Playwright,
cobrindo os critérios de aceite das specs 01–05.

## Escopo
- Configuração do Playwright (`@playwright/test`) no projeto raiz.
- `webServer` do Playwright sobe o app (build + servidor SSR) e o `server/` da API.
- Fixtures/stubs: `speechSynthesis` e chamadas de rede do dicionário.
- Rastreabilidade: cada teste referencia o CA que cobre.

## Requisitos
- **R6.1** Comandos: `npm run test` (Karma, inalterado), `npm run e2e` (Playwright),
  `npm run test:all` (ambos).
- **R6.2** `playwright.config.ts` inicia automaticamente `server/` (porta 3000) e o
  app Angular (porta 4200 via proxy) antes da suíte; encerra ao final.
- **R6.3** Projetos de navegador Chromium (desktop) + um emula mobile (viewport
  estreito) para validar o layout responsivo do `/result`.
- **R6.4** Stub de `speechSynthesis` via `addInitScript` em todos os testes E2E
  (determinístico, sem depender de voz do SO); testes de dicionário usam
  `page.route()` com fixtures JSON gravadas (incluindo casos 404/fallback).
- **R6.5** CI local: `npx playwright install chromium` documentado no README
  (hoje o ambiente não tem Chrome pré-instalado).
- **R6.6** Os specs `.md` da pasta `specs/` permanecem a fonte dos critérios;
  nomes de testes citam os CA (ex.: `CA3.1 wrong chars lock input`).

## Critérios de aceite
- **CA6.1** `npm run e2e` roda verde do zero após `npx playwright install chromium`.
- **CA6.2** A suíte E2E cobre pelo menos: fluxo completo 2 frases (spec-01/03),
  replay `Ctrl+.` (spec-02), reveal `Ctrl+;` e trava de erro (spec-03), dicionário
  com fallback (spec-04) e popup de seleção (spec-05).
- **CA6.3** Nenhum teste depende de rede externa (fontes mockadas por fixture).
- **CA6.4** `npm test` (Karma) segue verde com os novos unitários das specs 01–05.

## Dependências
- `@playwright/test` (1.64.x), download do Chromium.
- Servidor dev do Angular + `server/` (spec-04) para o `webServer` do Playwright.

## Testes
- Esta spec é a infra; seus próprios CA são validados rodando a suíte (`npm run e2e`
  e `npm test`) e conferindo o relatório HTML do Playwright.
