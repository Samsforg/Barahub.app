# BARAHUB — PHASE 6A : SÉCURISER LE WORKFLOW CI

Date : 23 octobre 2026

## 1. État Git actuel

| Élément | Valeur |
|---------|--------|
| Branche | `refonte-expo` |
| HEAD | `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe` |
| Fichier indexé | `pnpm-lock.yaml` (un seul, `A`) |
| `.github/workflows/ci.yml` | Non suivi (`??`, untracked) |
| `.github/workflows/deploy.yml` | Suivi dans HEAD, supprimé localement (`D`) |

Aucun commit, push, déploiement ou changement de branche n'a été effectué.

## 2. Pourquoi `ci.yml` est non suivi

`ci.yml` est un fichier créé localement dans le cadre des travaux de Phase 4 et Phase 5, mais il n'a jamais été ajouté à l'index Git. Seul `pnpm-lock.yaml` a été indexé (`git add -- pnpm-lock.yaml`), conformément à la règle de ne pas indexer d'autres fichiers sans autorisation.

Statut Git : `?? .github/workflows/ci.yml` (non suivi, présent uniquement dans le répertoire de travail).

## 3. Comparaison `ci.yml` vs `deploy.yml`

### `ci.yml` — Nouveau workflow de validation CI (non suivi)

| Élément | Valeur |
|---------|--------|
| Nom | CI |
| Déclencheurs | `push`, `pull_request` (toutes branches) |
| Permissions | `contents: read` (minimales) |
| Node.js | 24 |
| Gestionnaire | pnpm 9.12.0 |
| Installation | `pnpm install --frozen-lockfile` |
| Service MySQL | `mysql:8`, base `barahub_test` |
| Migrations | `drizzle-kit migrate` |
| Tests | `vitest run` |
| Lint | `eslint .` |
| Typecheck | `tsc --noEmit` |
| Build | `esbuild server/_core/index.ts` (bundle Node) |
| Déploiement | Aucun |
| Secrets | Aucun |
| Concurrency | `ci-${{ github.ref }}` |

### `deploy.yml` — Ancien workflow de déploiement (suivi dans HEAD, supprimé localement)

| Élément | Valeur |
|---------|--------|
| Nom | Deploy Barahub to GitHub Pages |
| Déclencheurs | `push` sur `[main]`, `workflow_dispatch` |
| Permissions | `contents: read`, `pages: write`, `id-token: write` |
| Node.js | 20 |
| Gestionnaire | npm |
| Installation | `npm install` (pas de lockfile gelé) |
| Service MySQL | Aucun |
| Migrations | Aucun |
| Tests | Aucun |
| Lint | Aucun |
| Typecheck | Aucun |
| Build | `npm run build` (Vite/PWA statique) |
| Déploiement | GitHub Pages (`actions/deploy-pages@v4`) |
| Secrets | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Concurrency | `pages` |

### Tableau comparatif

| Aspect | `ci.yml` | `deploy.yml` |
|--------|----------|--------------|
| But | Validation (lint, typecheck, test, build) | Déploiement GitHub Pages |
| Architecture cible | Expo / React Native / Node | Vite / PWA statique |
| Node | 24 | 20 |
| Gestionnaire | pnpm 9.12.0 | npm |
| Lockfile gelé | Oui | Non |
| MySQL 8 | Oui | Non |
| Déploiement | Non | Oui |
| Secrets requis | Non | Oui (Supabase) |
| Branche ciblée | Toutes (push + PR) | `main` uniquement |

## 4. Les deux workflows se contredisent-ils ?

**Non.** Les deux workflows ne se contredisent pas :

1. **Buts distincts** : `ci.yml` valide le code (aucun déploiement). `deploy.yml` déploie sur GitHub Pages.
2. **Déclencheurs non exclusifs** : `ci.yml` s'exécute sur `push` et `pull_request` vers n'importe quelle branche. `deploy.yml` ne s'exécute que sur `push` vers `main` ou `workflow_dispatch`. Il n'y a pas de conflit de déclenchement.
3. **Permissions disjointes** : `ci.yml` n'a que `contents: read`. `deploy.yml` ajoute `pages: write` et `id-token: write`. Aucun overlap dangereux.
4. **Architectures différentes** : `ci.yml` cible la nouvelle architecture Expo/Node. `deploy.yml` cible l'ancienne architecture Vite/PWA. Ils ne produisent pas le même artefact et ne publient pas au même endroit.

Les deux peuvent coexister dans le dépôt sans contradiction. `deploy.yml` reste pertinent pour l'ancienne application PWA sur `main`. `ci.yml` est pertinent pour la nouvelle architecture sur `refonte-expo`.

## 5. Risques identifiés

| Risque | Description | Gravité |
|--------|-------------|---------|
| `ci.yml` non suivi | Le workflow de validation n'est pas versionné dans Git ; il n'est pas disponible sur le dépôt distant. | Moyenne |
| `deploy.yml` supprimé localement | L'ancien workflow est absent du worktree mais présent dans HEAD. Il peut être restauré si nécessaire. | Faible |
| Aucune exécution distante | Aucun des deux workflows n'a été exécuté sur GitHub Actions depuis les modifications. | Moyenne |

## 6. Recommandations

1. Ne pas committer `ci.yml` ni `deploy.yml` sans autorisation explicite.
2. Conserver `pnpm-lock.yaml` comme seul fichier indexé.
3. Si le déploiement GitHub Pages n'est plus nécessaire pour la nouvelle architecture, `deploy.yml` peut rester supprimé localement sans impact sur `ci.yml`.
4. Pour activer la validation CI distante, il faudra committer et pousser `ci.yml` (sous réserve d'autorisation explicite).

## 7. Contrôle final

- `git diff --cached --name-status` → `A pnpm-lock.yaml` (uniquement)
- `git branch --show-current` → `refonte-expo`
- `git rev-parse HEAD` → `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe`
- Aucun commit, push, déploiement ou changement de branche n'a été effectué.
