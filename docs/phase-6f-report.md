# BARAHUB — PHASE 6F : AUDIT LOCAL POUR GITHUB ACTIONS / MYSQL 8

Date : 23 octobre 2026

## 1. État Git initial

| Élément | Valeur |
|---------|--------|
| Branche | `refonte-expo` |
| HEAD | `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe` |
| `main` / `origin/main` | `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe` |
| Fichier indexé | `pnpm-lock.yaml` (`A`) |
| Rapports précédents | `docs/phase-5b-report.md`, `docs/phase-5c-report.md`, `docs/phase-6c-report.md`, `docs/phase-6d-report.md`, `docs/phase-6e-report.md` |

Aucun commit, push, PR, déploiement ou changement de branche n’a eu lieu.

## 2. Inventaire des fichiers locaux

- Fichiers suivis modifiés : `.env.example`, `.gitignore`, `package.json`, `tsconfig.json`.
- Fichiers suivis supprimés : `.github/workflows/deploy.yml`, `README.md`, `client/**`, `package-lock.json`, `postcss.config.js`, `supabase/**`, `tailwind.config.ts`, `tsconfig.node.json`, `vite.config.ts`.
- Fichiers non suivis : `.github/workflows/ci.yml`, `.npmrc`, `.watchmanconfig`, `TODO.md`, `app.config.ts`, `app/**`, `assets/**`, `babel.config.js`, `components/**`, `constants/**`, `docs/**`, `drizzle.config.ts`, `drizzle/**`, `eslint.config.js`, `global.css`, `hooks/**`, `lib/**`, `metro.config.js`, `nativewind-env.d.ts`, `plan.md`, `public/**`, `scripts/**`, `server/**`, `shared/**`, `tailwind.config.js`, `tests/**`, `theme.config.d.ts`, `theme.config.js`.
- Fichiers ignorés pertinents : `.env`, `dist/`, `node_modules/`.

## 3. Identification des neuf tests

### Fichier 1 — `tests/pilot.checklist.integration.test.ts` (suite : `pilot checklist guards (persisted)`)

| # | Test | Raison d’ignorance | Dépendances / données |
|---|------|---------------------|----------------------|
| 1 | `creates catalog entries and refuses a fixed price when a diagnostic is mandatory` | `BARAHUB_TEST_DATABASE_URL` absent → `describe.skip` | DB MySQL, migrations |
| 2 | `assigns only verified providers covering the request zone and service` | idem | DB MySQL, migrations |
| 3 | `refuses a mission response from a suspended provider` | idem | DB MySQL, migrations |
| 4 | `refuses a second active complaint and restores the previous request status` | idem | DB MySQL, migrations |
| 5 | `restores the previous status when a refund is rejected` | idem | DB MySQL, migrations |

### Fichier 2 — `tests/pilot.multi-account.integration.test.ts` (suite : `pilot multi-account workflows (persisted)`)

| # | Test | Raison d’ignorance | Dépendances / données |
|---|------|---------------------|----------------------|
| 1 | `verifies a provider and assigns a request manually` | idem | DB MySQL, migrations |
| 2 | `opens a complaint without exposing it to another customer` | idem | DB MySQL, migrations |
| 3 | `restores the request status when a complaint is resolved` | idem | DB MySQL, migrations |
| 4 | `creates and completes a refund once` | idem | DB MySQL, migrations |

**Total : 9 tests.** Tous sont ignorés via `const suite = testDatabaseUrl ? describe : describe.skip;` et conditionnent la configuration `BARAHUB_TEST_DATABASE_URL`.

## 4. Scripts et variables effectivement confirmés

- `package.json` : `lint: "eslint ."`, `check: "tsc --noEmit"`, `test: "vitest run"`, `build: "esbuild ..."`, `db:push: "drizzle-kit generate && drizzle-kit migrate"`.
- `.github/workflows/ci.yml` : Node 24, pnpm 9.12.0, `pnpm install --frozen-lockfile`, MySQL 8 service (`barahub_test`, healthcheck), `corepack pnpm exec drizzle-kit migrate`, `pnpm test`.
- `server/db.ts` : `getDb()` lit `process.env.DATABASE_URL` puis `drizzle(process.env.DATABASE_URL)`.
- Tests : avant chaque suite, `process.env.DATABASE_URL = testDatabaseUrl;` puis `getDb()` ; après, nettoyage.

## 5. Proposition de configuration GitHub Actions

Déjà présente localement dans `.github/workflows/ci.yml` et confirmée :
- Node 24, pnpm 9.12.0, `pnpm install --frozen-lockfile`.
- Service MySQL 8 (`mysql:8`, base `barahub_test`, healthcheck `mysqladmin ping -h localhost -proot`).
- Migrations avant tests (`drizzle-kit migrate`), variables `BARAHUB_TEST_DATABASE_URL` + `DATABASE_URL`.
- Jobs : lint, typecheck, test, build — aucun déploiement.
- Permissions : `contents: read`.

Ancien `deploy.yml` : incompatible avec la nouvelle architecture (Node 20, npm, Vite/PWA, GitHub Pages, secrets `VITE_SUPABASE_*`). Ne doit pas être déclenché pour la nouvelle CI.

## 6. Prérequis manquants et risques

- MySQL 8 local indisponible ; Docker indisponible.
- `ci.yml` non versionné (`??`).
- Migration/tests nécessitent une base dédiée `barahub_test` et migrations.
- Risque : déclencher accidentellement l’ancien workflow GitHub Pages via `deploy.yml` (push main / workflow_dispatch) — à neutraliser avant toute fusion de la refonte.

## 7. Commandes qui seront exécutées lors d'une phase ultérieure

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm exec eslint .`
- `corepack pnpm exec tsc --noEmit`
- `corepack pnpm exec vitest run`
- `corepack pnpm build`
- (Puis, si MySQL disponible) : configurer `BARAHUB_TEST_DATABASE_URL` / `DATABASE_URL`, `corepack pnpm exec drizzle-kit migrate`, relancer `vitest run`.

## 8. Verdict — Phase 6F

**`CONFIGURATION CI PRÊT À ÊTRE RÉDIGÉE`**

La configuration GitHub Actions MySQL 8 / Node 24 / pnpm 9.12.0 / `barahub_test` / migrations / scripts est confirmée et prête à être rédigée ou exécutée ultérieurement ; les 9 tests et leur condition d’exécution sont identifiés précisément.

## 9. Contrôle final

- `git status --short` : modifications locales présentes, seul `pnpm-lock.yaml` indexé.
- `git branch --show-current` : `refonte-expo`.
- `git rev-parse HEAD` : `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe`.
- `git diff --cached --name-status` : `A pnpm-lock.yaml`.
- `git diff --cached --check` : OK.

Aucun commit, push, déploiement, PR ou changement de branche n’a eu lieu. Aucun service ni base n’a été installé ou modifié. Aucun test n’a été exécuté en dehors des vérifications déjà réalisées (`vitest run` : 86 réussis / 9 ignorés).

## 10. Résumé concis

- Audit local pour GitHub Actions / MySQL 8 : **terminé**.
- Neuf tests identifiés : 5 (checklist) + 4 (multi-account), tous conditionnés par `BARAHUB_TEST_DATABASE_URL`.
- Configuration CI MySQL : **prête** (Node 24, pnpm 9.12.0, frozen, MySQL 8, `barahub_test`, migrations, scripts).
- Blocage restant : exécution réelle des 9 tests (MySQL indisponible localement ; CI nécessite versionnement du workflow).
