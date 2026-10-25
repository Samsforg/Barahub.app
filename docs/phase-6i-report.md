# BARAHUB — PHASE 6I — PRÉPARER LA VALIDATION MYSQL ET GITHUB ACTIONS SANS PUBLICATION

Date : 23 octobre 2026

## 1. État Git avant/après

- Branche : `refonte-expo`
- HEAD : `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe`
- Fichier indexé : `pnpm-lock.yaml` (`A`)

Aucun commit, push, PR, déploiement ou changement de branche n’a eu lieu.

## 2. Liste des 9 tests et fichiers

- `tests/pilot.checklist.integration.test.ts` — suite `pilot checklist guards (persisted)` — 5 tests.
- `tests/pilot.multi-account.integration.test.ts` — suite `pilot multi-account workflows (persisted)` — 4 tests.

Tous ignorés via `const suite = testDatabaseUrl ? describe : describe.skip;`.

## 3. Dépendances et variables requises, sans valeurs secrètes

- MySQL 8, via Drizzle mysql2 (`DATABASE_URL`).
- `BARAHUB_TEST_DATABASE_URL` (assigné à `DATABASE_URL`) et migrations (`drizzle-kit migrate`).

## 4. Options d’exécution comparées

| Option | État | Recommandation |
|--------|------|----------------|
| A. GitHub Actions MySQL 8 service | Workflow `ci.yml` déjà préparé | **Recommandée** (moins risquée / coûteuse) |
| B. Docker local | Indisponible | Non applicable |
| C. MySQL local | Indisponible | Non applicable |
| D. Autre environnement | Non présent | Non applicable |

## 5. Recommandation

**Option A** : GitHub Actions avec MySQL 8 comme service du job — elle est déjà configurée dans `.github/workflows/ci.yml` et utilise des ressources éphémères isolées.

## 6. Obstacles restants et étapes à autoriser séparément

- Obtenir l’autorisation pour committer/pousser la branche de refonte incluant `ci.yml` et la suppression de `deploy.yml`.
- Obtenir l’autorisation pour déclencher/lancer la CI.
- Obtenir une base MySQL 8 dédiée `barahub_test` (dans le service CI, isolé).

## 7. Verdict — Phase 6I

**`PRÊT POUR AUTORISATION DE PUBLICATION`**

## 8. Contrôle final

- `git status --short` : modifications locales présentes, seul `pnpm-lock.yaml` indexé.
- `git branch --show-current` : `refonte-expo`.
- `git rev-parse HEAD` : `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe`.
- `git diff --cached --name-status` : `A pnpm-lock.yaml`.
- `git diff --cached --check` : OK.

Aucun commit, push, PR, déploiement, changement de branche, installation de service ou modification de base n’a eu lieu. Aucun secret ni valeur de connexion n’a été affiché ni demandé.
