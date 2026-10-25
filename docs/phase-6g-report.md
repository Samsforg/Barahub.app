# BARAHUB — PHASE 6G : RÉDIGER ET AUDITER LE WORKFLOW CI

Date : 23 octobre 2026

## 1. État Git initial

| Élément | Valeur |
|---------|--------|
| Branche | `refonte-expo` |
| HEAD | `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe` |
| `main` / `origin/main` | `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe` |
| Fichier indexé | `pnpm-lock.yaml` (`A`) |

Aucun commit, push, PR, déploiement ou changement de branche n’a eu lieu.

## 2. Scripts et variables confirmés

- Scripts : `lint: "eslint ."`, `check: "tsc --noEmit"`, `test: "vitest run"`, `build: "esbuild ..."`, `db:push: "drizzle-kit generate && drizzle-kit migrate"`.
- Migration : `corepack pnpm exec drizzle-kit migrate`.
- MySQL : `BARAHUB_TEST_DATABASE_URL` + `DATABASE_URL` (tests assignent `DATABASE_URL = BARAHUB_TEST_DATABASE_URL`).
- Ignorance des tests : `const suite = testDatabaseUrl ? describe : describe.skip;` sur `BARAHUB_TEST_DATABASE_URL`.

## 3. Workflow proposé — `.github/workflows/ci.yml`

- Déclencheurs : `push`, `pull_request`.
- Permissions : `contents: read`.
- Node : 24 ; pnpm : 9.12.0 ; `pnpm install --frozen-lockfile`.
- Service MySQL 8 : `mysql:8`, base `barahub_test`, healthcheck `mysqladmin ping -h localhost -proot`.
- Variables de test locales au job : `BARAHUB_TEST_DATABASE_URL`, `DATABASE_URL`.
- Migrations avant tests : `corepack pnpm exec drizzle-kit migrate`.
- Contrôles : lint, typecheck, test, build — aucun déploiement.
- Aucun secret de production ; aucun accès à la base de production.

## 4. Contrôles réalisés

- Workflow existant localement et audité : conforme aux scripts réels.
- Commandes vérifiées sans exécuter MySQL ni les neuf tests.
- Aucun outil YAML supplémentaire installé (vérification statique du YAML existant).

## 5. Limites non vérifiées

- Exécution réelle du workflow GitHub Actions (non exécutée).
- Runtime MySQL 8 service + tests avec base réelle.

## 6. Risques résiduels

- `ci.yml` non versionné (`??`) ; `deploy.yml` présent dans HEAD, supprimé localement.
- Avant fusion de la refonte : neutraliser `deploy.yml` pour éviter tout déploiement GitHub Pages accidentel.

## 7. Commandes qui seront exécutées lors d'une phase ultérieure

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm exec eslint .`
- `corepack pnpm exec tsc --noEmit`
- `corepack pnpm exec vitest run`
- `corepack pnpm build`
- (Puis) configurer MySQL `barahub_test`, migrer, relancer les tests.

## 8. Verdict — Phase 6G

**`WORKFLOW RÉDIGÉ ET AUDITÉ`**

## 9. Contrôle final

- `git status --short` : modifications locales présentes, seul `pnpm-lock.yaml` indexé.
- `git branch --show-current` : `refonte-expo`.
- `git rev-parse HEAD` : `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe`.
- `git diff --cached --name-status` : `A pnpm-lock.yaml`.
- `git diff --cached --check` : OK.

Aucun commit, push, déploiement, PR ou changement de branche n’a eu lieu. Le workflow n’a pas été indexé. Aucun service ni base n’a été installé ou modifié.
