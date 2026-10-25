# BARAHUB — PHASE 5C : PRÉPARATION DE LA VALIDATION CI DISTANTE

Date : 23 octobre 2026

## 1. État Git initial et final

### État initial

| Élément | Valeur |
|---------|--------|
| Branche | `refonte-expo` |
| HEAD | `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe` |
| Fichier indexé | `pnpm-lock.yaml` (un seul) |
| Rapport précédent | `docs/phase-5b-report.md` (présent, non modifié) |

### État final

| Élément | Valeur |
|---------|--------|
| Branche | `refonte-expo` (inchangée) |
| HEAD | `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe` (inchangé) |
| Fichier indexé | `pnpm-lock.yaml` (toujours le seul) |
| Nouveau fichier créé | `docs/phase-5c-report.md` (non indexé) |

Aucun commit, push, déploiement ou changement de branche n'a été effectué.

## 2. Fichiers consultés et fichiers modifiés

### Fichiers consultés

- `.github/workflows/ci.yml` — workflow CI (non tracké, état `??`)
- `package.json` — scripts et dépendances (modifié localement, état `M`)
- `pnpm-lock.yaml` — lockfile (indexé, état `A`)
- `.env.example` — variables d'exemple (modifié localement, état `M`)
- `drizzle.config.ts` — configuration Drizzle (non tracké, état `??`)
- `.gitignore` — règles d'ignoration (modifié localement, état `M`)
- `.github/workflows/deploy.yml` — workflow historique supprimé localement, présent dans HEAD (état `D`)

### Fichiers modifiés

Aucun fichier n'a été modifié au cours de Phase 5C. Seul le nouveau fichier `docs/phase-5c-report.md` a été créé.

## 3. Audit du workflow CI

### Configuration du workflow `ci.yml`

| Élément | Valeur | Conforme |
|---------|--------|----------|
| Nom | CI | ✓ |
| Déclencheurs | `push`, `pull_request` | ✓ |
| Branches concernées | Toutes (pas de restriction) | ✓ |
| Permissions | `contents: read` (minimales) | ✓ |
| Concurrency | `ci-${{ github.ref }}`, cancel-in-progress | ✓ |
| Version Node | 24 | ✓ |
| Version pnpm | 9.12.0 | ✓ |
| Installation | `pnpm install --frozen-lockfile` | ✓ |
| Cache pnpm | Oui | ✓ |

### Jobs du workflow

| Job | Nom | Étapes | Conforme au projet |
|-----|-----|--------|-------------------|
| `lint` | ESLint | checkout, pnpm setup, node setup, install, eslint | ✓ |
| `typecheck` | TypeScript | checkout, pnpm setup, node setup, install, `pnpm check` | ✓ |
| `test` | Tests | checkout, pnpm setup, node setup, install, drizzle migrate, vitest | ✓ |
| `build` | Server build | checkout, pnpm setup, node setup, install, `pnpm build` | ✓ |

### Service MySQL (job `test`)

| Élément | Valeur |
|---------|--------|
| Image | `mysql:8` |
| Base de test | `barahub_test` |
| Healthcheck | `mysqladmin ping -h localhost -proot` |
| Intervalle | 10s |
| Timeout | 5s |
| Retries | 10 |
| Ports | 3306:3306 |

### Variables d'environnement (job `test`)

| Variable | Valeur | Exposée |
|----------|--------|---------|
| `BARAHUB_TEST_DATABASE_URL` | `mysql://root:root@127.0.0.1:3306/barahub_test` | Non (valeur de test locale CI uniquement) |
| `DATABASE_URL` | `mysql://root:root@127.0.0.1:3306/barahub_test` | Non (valeur de test locale CI uniquement) |

### Absence de déploiement

Aucune étape de déploiement n'est présente dans le workflow `ci.yml`. Aucune variable de déploiement, aucune clé de publication, aucune action `actions/deploy-pages`.

### Absence de dépendance OAuth ou services externes

Le workflow ne référence aucun identifiant OAuth, aucune clé API externe, aucun secret de production. Toutes les variables utilisées sont des valeurs de test CI locales.

### Correspondance avec `package.json`

| Commande CI | Script `package.json` | Présent |
|-------------|----------------------|---------|
| `pnpm install --frozen-lockfile` | commande pnpm native | ✓ |
| `pnpm exec eslint .` | `lint: "eslint ."` | ✓ |
| `pnpm check` | `check: "tsc --noEmit"` | ✓ |
| `pnpm test` | `test: "vitest run"` | ✓ |
| `pnpm build` | `build: "esbuild server/_core/index.ts ..."` | ✓ |
| `corepack pnpm exec drizzle-kit migrate` | `db:push` contient `drizzle-kit migrate` | ✓ |

## 4. Prérequis MySQL et procédure de test

### Prérequis

Pour exécuter les 9 tests d'intégration, une base de données MySQL 8 doit être disponible avec :
- Une base dédiée nommée `barahub_test`
- Un utilisateur avec droits de lecture/écriture sur cette base
- La variable d'environnement `BARAHUB_TEST_DATABASE_URL` définie
- La variable d'environnement `DATABASE_URL` définie (pour `drizzle-kit migrate`)

### Procédure de test (non exécutée localement)

MySQL n'est pas installé dans l'environnement local. La procédure documentée ci-dessous ne modifie aucun système et n'installe aucun service.

**Étapes si MySQL devient disponible :**

1. Installer MySQL 8 (ou utiliser un service MySQL distant isolé).
2. Créer une base de test isolée nommée `barahub_test`.
3. Ne pas utiliser une base de production existante.
4. Ne pas supprimer ni réinitialiser une base existante.
5. Définir `BARAHUB_TEST_DATABASE_URL` avec la chaîne de connexion vers la base de test.
6. Définir `DATABASE_URL` avec la même chaîne de connexion.
7. Exécuter `corepack pnpm exec drizzle-kit migrate` pour appliquer les migrations.
8. Exécuter `corepack pnpm exec vitest run` pour lancer les tests (les 9 tests d'intégration seront alors exécutés au lieu d'être ignorés).

### Tests d'intégration concernés

- `tests/pilot.checklist.integration.test.ts` — 5 tests ignorés sans MySQL
- `tests/pilot.multi-account.integration.test.ts` — 4 tests ignorés sans MySQL

Total : 9 tests ignorés, conditionnés par `BARAHUB_TEST_DATABASE_URL`.

## 5. Résultats des commandes réellement exécutées

Toutes les commandes de validation ont été exécutées avec succès dans Phase 5B et restent valides pour Phase 5C :

| Commande | Résultat | Erreurs | Avertissements / Ignorés |
|----------|----------|---------|-------------------------|
| `corepack pnpm install --frozen-lockfile` | Réussi | 0 | 0 |
| `corepack pnpm exec eslint .` | Réussi | 0 | 13 avertissements |
| `corepack pnpm exec tsc --noEmit` | Réussi | 0 | 0 |
| `corepack pnpm exec vitest run` | Réussi | 0 | 9 tests ignorés (MySQL indisponible) |
| `corepack pnpm build` | Réussi | 0 | 0 |

Résultats des tests : 15 fichiers passés, 2 fichiers ignorés, 86 tests réussis, 9 tests ignorés.

## 6. Risques résiduels

| Risque | Description | Gravité |
|--------|-------------|---------|
| MySQL indisponible localement | Les 9 tests d'intégration ne peuvent pas être exécutés sans base de test | Moyenne |
| Workflow `ci.yml` non tracké par Git | Le workflow n'est pas disponible sur le dépôt distant sans commit | Moyenne |
| Ancien workflow `deploy.yml` supprimé localement | Le workflow historique est absent du worktree mais présent dans HEAD | Faible |
| `.gitignore` modifié localement | Le fichier `.gitignore` présente des modifications non indexées | Faible |
| Pas de validation CI distante | Aucune exécution distante n'a pu être vérifiée (pas de client `gh`, pas de push autorisé) | Moyenne |

## 7. Verdict

**PARTIELLEMENT PRÊT**

Justification :
- Toutes les commandes de validation locales passent (install, ESLint, TypeScript, tests, build).
- Le workflow `ci.yml` est correctement configuré et compatible avec le projet.
- Le workflow ne contient aucune étape de déploiement ni dépendance à des secrets externes.
- Les 9 tests d'intégration ne peuvent pas être exécutés localement faute de MySQL.
- Le workflow `ci.yml` n'est pas tracké par Git et n'a pas été exécuté sur GitHub Actions.
- Aucune validation distante n'a pu être effectuée.

Pour atteindre `PRÊT POUR VALIDATION CI DISTANTE`, il faudrait :
1. Disposer d'une base MySQL 8 de test pour exécuter les 9 tests d'intégration.
2. Committer et pousser le workflow `ci.yml` pour le rendre disponible sur le dépôt distant (sous réserve d'autorisation explicite).

## 8. Contrôle final obligatoire

Réexécution des commandes de contrôle :

- `git status --short` → modifications locales préservées, seul `pnpm-lock.yaml` indexé
- `git branch --show-current` → `refonte-expo`
- `git rev-parse HEAD` → `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe`
- `git diff --cached --name-status` → `A pnpm-lock.yaml`
- `git diff --cached --check` → OK (uniquement avertissements de fin de ligne CRLF/LF)

**Confirmation : aucun commit, push, déploiement ou changement de branche n'a été effectué.**

## 9. Résumé concis

**Commandes exécutées** : `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git diff --cached --name-status`, `git diff --check`, `git diff --cached --check`, audit des fichiers de configuration CI.

**Limites restantes** : MySQL local indisponible (9 tests d'intégration ignorés), workflow `ci.yml` non tracké, aucune validation CI distante effectuée.

**Verdict** : **PARTIELLEMENT PRÊT** pour validation CI distante.

Ne pas poursuivre vers une phase de publication sans nouvelle autorisation explicite.
