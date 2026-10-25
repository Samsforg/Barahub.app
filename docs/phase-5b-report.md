# BARAHUB — PHASE 5B : VALIDATION LOCALE DE LA NOUVELLE CI

Date : 23 octobre 2026

## 1. Résumé exécutif

Toutes les commandes de validation locales ont été exécutées avec succès sur la branche `refonte-expo`. Le workflow CI préparé (`ci.yml`) est compatible avec les scripts du projet `package.json`. Aucun déploiement n'a été effectué. Aucun commit n'a été réalisé.

Verdict : **VALIDÉ LOCALEMENT**

## 2. Lot 1 — Précontrôle

| Commande | Résultat |
|----------|----------|
| `git branch --show-current` | `refonte-expo` |
| `git diff --cached --name-status` | `A pnpm-lock.yaml` (un seul fichier indexé) |
| `git diff --cached --check` | OK (aucune erreur d'espace) |

Seul `pnpm-lock.yaml` est indexé. Pas de déviation.

## 3. Lot 2 — Vérification des scripts réels

Commandes du workflow CI comparées à `package.json` :

| Commande CI | Script `package.json` | Statut |
|-------------|----------------------|--------|
| `pnpm install --frozen-lockfile` | commande pnpm native | ✓ |
| `pnpm exec eslint .` | `lint: "eslint ."` | ✓ |
| `pnpm exec tsc --noEmit` | `check: "tsc --noEmit"` | ✓ |
| `pnpm exec vitest run` | `test: "vitest run"` | ✓ |
| `pnpm build` | `build: "esbuild ..."` | ✓ |

`.npmrc` : `node-linker=hoisted`

## 4. Lot 3 — Exécution locale

### 4.1 Installation (`pnpm install --frozen-lockfile`)

- Résultat : Lockfile à jour, étape de résolution ignorée, 166 paquets réutilisés.
- Statut : **RÉUSSI**

### 4.2 ESLint (`pnpm exec eslint .`)

- Résultat : 0 erreurs, 13 avertissements.
- Statut : **RÉUSSI**

### 4.3 TypeScript (`pnpm exec tsc --noEmit`)

- Résultat : aucune erreur.
- Statut : **RÉUSSI**

### 4.4 Tests (`pnpm exec vitest run`)

| Métrique | Valeur |
|----------|--------|
| Fichiers de tests passés | 15 |
| Fichiers de tests ignorés | 2 |
| Tests réussis | 86 |
| Tests ignorés | 9 |
| Durée | ~9,0 s |

Les 9 tests ignorés proviennent de 2 fichiers d'intégration :
- `tests/pilot.checklist.integration.test.ts` (5 tests ignorés)
- `tests/pilot.multi-account.integration.test.ts` (4 tests ignorés)

Ces tests sont conditionnés par la présence de `BARAHUB_TEST_DATABASE_URL`. MySQL n'étant pas disponible localement, ils sont ignorés (`describe.skip`).

- Statut : **RÉUSSI** (avec 9 tests ignorés par manque de MySQL)

### 4.5 Build (`pnpm build`)

- Résultat : `dist\index.js` de 147,6 ko.
- Statut : **RÉUSSI**

### Tableau récapitulatif

| Commande | Résultat | Erreurs | Avertissements / Ignorés |
|----------|----------|---------|-------------------------|
| `pnpm install --frozen-lockfile` | Réussi | 0 | 0 |
| `pnpm exec eslint .` | Réussi | 0 | 13 avertissements |
| `pnpm exec tsc --noEmit` | Réussi | 0 | 0 |
| `pnpm exec vitest run` | Réussi | 0 | 9 tests ignorés |
| `pnpm build` | Réussi | 0 | 0 |

## 5. Lot 4 — Audit du workflow CI

| Élément | Valeur dans `ci.yml` | Conforme au projet |
|---------|---------------------|-------------------|
| Version Node | 24 | ✓ |
| Version pnpm | 9.12.0 | ✓ |
| Installation | `pnpm install --frozen-lockfile` | ✓ |
| Service MySQL | image `mysql:8` | ✓ |
| Healthcheck | `mysqladmin ping -h localhost -proot` | ✓ |
| Base de test | `barahub_test` | ✓ |
| Migrations Drizzle | `corepack pnpm exec drizzle-kit migrate` | ✓ |
| Variables de test | `BARAHUB_TEST_DATABASE_URL`, `DATABASE_URL` | ✓ |
| Étape de déploiement | Aucune | ✓ |
| Jobs | lint, typecheck, test, build | ✓ |

Le workflow `ci.yml` est **compatible** avec les scripts de `package.json` et la configuration Expo/Node/MySQL. Aucun déploiement n'est configuré.

## 6. Limites

- MySQL local indisponible : les tests d'intégration (9 tests, 2 fichiers) sont ignorés.
- Le workflow `ci.yml` n'est pas tracké par Git (état `??`), il n'est donc pas disponible sur le dépôt distant.
- Aucun test de CI distante n'a été exécuté (pas de client `gh`, pas de push autorisé).
- L'ancien workflow `deploy.yml` (Node 20, npm, Vite/PWA, GitHub Pages) est incompatible avec la nouvelle architecture Expo/Node.

## 7. Prochaines actions manuelles

1. Si MySQL devient disponible : configurer `BARAHUB_TEST_DATABASE_URL`, exécuter `corepack pnpm exec drizzle-kit migrate`, puis relancer `pnpm test` pour inclure les tests d'intégration.
2. Si un accès GitHub Actions est rétabli : comparer les exécutions distantes de `ci.yml` avec les résultats locaux ci-dessus.
3. Maintenir `pnpm-lock.yaml` indexé sans ajouter d'autres fichiers.

## 8. État final Git

- `git status --short` : modifications locales préservées (non commitées)
- `git diff --cached --name-status` : `A pnpm-lock.yaml`
- `git branch --show-current` : `refonte-expo`
- `git log -1 --oneline` : `8d6e328 Graceful fallback when no SMS number configured`

Aucun commit, push, déploiement ou modification de `main`.
