# BARAHUB — PHASE 6D : PRÉPARATION SÉCURISÉE DE LA VALIDATION CI DISTANTE

Date : 23 octobre 2026

## 1. État Git avant/après

### État vérifié

| Élément | Valeur |
|---------|--------|
| Branche | `refonte-expo` |
| HEAD | `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe` |
| `main` | `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe` |
| `origin/main` | `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe` |
| Fichier indexé | `pnpm-lock.yaml` (`A`) |

### Diff staged (index vs HEAD)

- `git diff --cached --name-status` → `A pnpm-lock.yaml` uniquement.

### Diff unstaged (worktree vs index)

- Fichiers modifiés : `.env.example`, `.gitignore`, `package.json`, `tsconfig.json`.
- Fichiers supprimés : `.github/workflows/deploy.yml`, `README.md`, `client/**`, `package-lock.json`, `postcss.config.js`, `supabase/**`, `tailwind.config.ts`, `tsconfig.node.json`, `vite.config.ts`.

Aucun écart non compris n’a nécessité de correction automatique.

## 2. Inventaire des fichiers

### 1. Fichiers suivis modifiés

- `.env.example`, `.gitignore`, `package.json`, `tsconfig.json`.

### 2. Fichiers suivis supprimés

- `.github/workflows/deploy.yml`, `README.md`, `client/**`, `package-lock.json`, `postcss.config.js`, `supabase/**`, `tailwind.config.ts`, `tsconfig.node.json`, `vite.config.ts`.

### 3. Fichiers non suivis

- `.github/workflows/ci.yml`, `.npmrc`, `.watchmanconfig`, `TODO.md`, `app.config.ts`, `app/**`, `assets/**`, `babel.config.js`, `components/**`, `constants/**`, `docs/**`, `drizzle.config.ts`, `drizzle/**`, `eslint.config.js`, `global.css`, `hooks/**`, `lib/**`, `metro.config.js`, `nativewind-env.d.ts`, `plan.md`, `public/**`, `scripts/**`, `server/**`, `shared/**`, `tailwind.config.js`, `tests/**`, `theme.config.d.ts`, `theme.config.js`.

### 4. Fichiers ignorés pertinents

- `.env` (`.gitignore:70`), `dist/` (`.gitignore:10`), `node_modules/` (`.gitignore:4`).

### 5. Fichiers actuellement indexés

- `pnpm-lock.yaml`.

## 3. Audit des workflows

### `ci.yml` (non suivi, `??`)

- Contient uniquement des contrôles : jobs `lint`, `typecheck`, `test`, `build`.
- Aucun job de déploiement.
- Déclencheurs : `push`, `pull_request`.
- Permissions : `contents: read`.
- Node : 24, pnpm : 9.12.0, installation `pnpm install --frozen-lockfile`.
- Tests : service MySQL `mysql:8`, base `barahub_test`, healthcheck, migrations `drizzle-kit migrate`, variables `BARAHUB_TEST_DATABASE_URL` + `DATABASE_URL`.
- Build : `pnpm build` (esbuild, bundle Node).

### Ancien `deploy.yml`

- Déploiement GitHub Pages, Node 20, npm, `npm install`, `npm run build` (Vite/PWA), secrets `VITE_SUPABASE_*`.
- Incompatible avec la nouvelle architecture Expo/Node.
- Déclencheurs : push sur `main`, `workflow_dispatch`.

### Cohérence

- Pas de contradiction entre `ci.yml` et `deploy.yml` : buts distincts (validation vs déploiement).
- L'ancien workflow doit être retiré/inactivé avant toute fusion de la refonte.

## 4. Évaluation des tests d'intégration

- 9 tests ignorés : `tests/pilot.checklist.integration.test.ts` (5) + `tests/pilot.multi-account.integration.test.ts` (4).
- Condition : `BARAHUB_TEST_DATABASE_URL` absent → `describe.skip`.
- Config MySQL attendue : `BARAHUB_TEST_DATABASE_URL` + `DATABASE_URL` → `mysql://root:root@127.0.0.1:3306/barahub_test`.
- Migrations : `corepack pnpm exec drizzle-kit migrate`.

## 5. Prérequis manquants avant une PR de validation CI distante

1. MySQL 8 disponible (ou service CI) pour exécuter les 9 tests d'intégration.
2. Workflow `ci.yml` versionné (commit + push) pour déclencher une exécution distante.
3. Aucun commit/push/PR effectué dans ce lot.

## 6. Étapes restant avant une PR

1. Obtenir une base MySQL 8 dédiée `barahub_test`.
2. Versionner `ci.yml` (sous autorisation).
3. Committer la refonte sur une branche de refonte.
4. Ouvrir une PR refonte → main.
5. Avant fusion : retirer/inactiver `deploy.yml`.

## 7. Verdict

- **État local de validation** : `VALIDÉ LOCALEMENT` (Phase 5B).
- **État CI distant** : **BLOQUÉ** pour l'instant (workflow non versionné, MySQL indisponible).
- **Verdict global Phase 6D** : **`PARTIELLEMENT PRÊT`**

Pour une validation CI distante : il manque MySQL local et versionnage du workflow `ci.yml`.

## 8. Contrôle final

- `git status --short` : modifications locales présentes, seul `pnpm-lock.yaml` indexé.
- `git branch --show-current` : `refonte-expo`.
- `git rev-parse HEAD` : `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe`.
- `git diff --cached --name-status` : `A pnpm-lock.yaml`.
- `git diff --cached --check` : OK.

Aucun commit, push, déploiement, PR ou changement de branche n’a été effectué.