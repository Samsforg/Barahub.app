# BARAHUB — PHASE 6C : PRÉPARER UNE PULL REQUEST

Date : 23 octobre 2026

## 1. État Git actuel

| Élément | Valeur |
|---------|--------|
| Branche courante | `refonte-expo` |
| HEAD | `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe` |
| `main` | `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe` (identique) |
| `origin/main` | `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe` (identique) |
| Fichier indexé | `pnpm-lock.yaml` (un seul, `A`) |

### Interprétation

- La refonte Expo/React Native est **présente dans le working tree** comme modifications locales (anciens fichiers supprimés, nouveaux fichiers untracked, `package.json` modifié).
- Aucun commit de la refonte n'a été réalisé.
- `refonte-expo`, `main` et `origin/main` pointent actuellement au même commit `8d6e328`.

## 2. Contexte des workflows

| Workflow | Statut | Cible | Déclencheur | Contenu |
|----------|--------|-------|-------------|---------|
| `.github/workflows/ci.yml` | Non suivi (`??`) | Toutes les branches | `push`, `pull_request` | Lint, typecheck, test (MySQL 8), build. Aucun déploiement. |
| `.github/workflows/deploy.yml` | Suivi dans HEAD, supprimé localement (`D`) | `main` uniquement | `push` sur `main`, `workflow_dispatch` | Déploiement GitHub Pages (Node 20, npm, Vite/PWA). Permissions `pages: write`, `id-token: write`. Secrets `VITE_SUPABASE_*`. |

## 3. Définir comment proposer la refonte Expo sans remplacer accidentellement l'ancienne application sur main

### Objectif

Proposer la refonte Expo (nouvelle architecture) via une Pull Request, tout en évitant qu'une exécution accidentelle du workflow de déploiement remplisse ou remplace l'ancienne application Vite/PWA sur GitHub Pages / main.

### Procédure proposée (préparation, sans commit/push)

1. **Créer une branche de refonte dédiée** (distincte de `main`) si ce n'est pas déjà le cas. La branche de travail actuelle est `refonte-expo`.
2. **Commiter le state actuel de la refonte** sur cette branche de refonte (packages, lockfile, nouveaux fichiers Expo, suppression des anciens fichiers Vite/PWA, ajout de `ci.yml`, suppression de `deploy.yml`).
3. **Ouvrir une Pull Request** depuis la branche de refonte vers `main`.
4. **Avant fusion**, s'assurer que le workflow de déploiement ne s'exécutera pas sur la nouvelle architecture :
   - Soit supprimer `deploy.yml` (état actuel du working tree : `D .github/workflows/deploy.yml`) avant le merge ;
   - Soit le conserver mais conditionner le déploiement au chemin/build Vite/PWA, ou le désactiver via GitHub Actions.
5. **Après fusion**, `main` contient la nouvelle architecture Expo. Le workflow `ci.yml` (validation) pourra s'exécuter. Le workflow `deploy.yml` (déploiement GitHub Pages) doit être absent ou inactif pour ne pas déployer l'ancienne application.

### Sécurité avant fusion

- Aucun commit, push, déploiement ou changement de branche n'a été effectué dans le cadre de Phase 6C.
- `pnpm-lock.yaml` reste le seul fichier indexé.
- Aucun secret réel n'a été affiché, copié ou injecté.

### Risque actuel

- Étant donné que `refonte-expo` == `main`, toute Pull Request vers `main` nécessitera d'abord un commit de la refonte.
- Tant que la refonte n'est pas committée, aucune PR ne peut l'exprimer proprement.
- Le workflow `deploy.yml` actuel (présent dans HEAD, supprimé localement) ciblerait `main` ; il faudra le retirer/conditionner avant qu'une fusion de la refonte ne déclenche un déploiement de l'ancienne application.

## 4. Recommandation concrète

Pour proposer la refonte Expo **sans remplacer accidentellement l'ancienne application** :

1. Préparer une branche de refonte (ex. `refonte-expo`) avec le commit de la refonte.
2. Inclure dans ce commit :
   - Ajout de `.github/workflows/ci.yml` ;
   - Suppression de `.github/workflows/deploy.yml` ;
   - Ajout des fichiers Expo/Node ;
   - Suppression des anciens fichiers Vite/PWA ;
   - `package.json` / `pnpm-lock.yaml` mis à jour.
3. Ouvrir une PR `refonte-expo` → `main`.
4. Vérifier que le workflow de déploiement n'est plus présent ou n'est pas déclenché pour la nouvelle architecture avant fusion.

## 5. Contrôle final

- `git branch --show-current` → `refonte-expo`
- `git rev-parse HEAD` → `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe`
- `git diff --cached --name-status` → `A pnpm-lock.yaml`
- `git diff --cached --check` → OK

**Confirmation : aucun commit, push, déploiement ou changement de branche n'a été effectué.**
**Aucune Pull Request n'a été créée (hors cadre de cette analyse).**

## 6. Verdict

**PRÊT À ÊTRE PRÉPARÉE MANUELLEMENT (Phase 6C)**

La préparation d'une Pull Request pour la refonte Expo est définie. La fusion doit être précédée de la suppression/inactivation du workflow de déploiement GitHub Pages et du commit de la refonte.
