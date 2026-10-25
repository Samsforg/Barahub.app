# BARAHUB — PHASE 5 : DIAGNOSTIC DU WORKFLOW GITHUB HISTORIQUE

Date : 23 octobre 2026

## 1. État Git actuel

- Branche courante : `refonte-expo`
- Commit HEAD : `8d6e328 Graceful fallback when no SMS number configured`
- Fichier indexé : `pnpm-lock.yaml` (ajout, unique)
- Pas de commit, push, déploiement, ni modification de `main`

## 2. Fichiers `.github/workflows/*` présents localement

### `deploy.yml` — Workflow historique (tracké, supprimé localement)

Statut Git : `D .github/workflows/deploy.yml` (présent dans HEAD, absent du worktree)

Contenu depuis HEAD :

```
name: Deploy Barahub to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install dependencies
        run: npm install
      - name: Build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        run: npm run build
      - name: SPA fallback (404.html) for GitHub Pages
        run: cp dist/index.html dist/404.html
      - name: Add CNAME for custom domain
        run: echo "barahub.pro" > dist/CNAME
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### `ci.yml` — Workflow de validation CI (nouveau, non tracké)

Statut Git : `?? .github/workflows/ci.yml` (présent dans le worktree, non indexé)

Contenu : Node 24, pnpm 9.12.0, MySQL 8 service, jobs lint / typecheck / test / build, aucun déploiement.

## 3. Historique Git des workflows

Commits ayant touché `.github/workflows/` :

```
d6aeef0 Fix branding: Barahub (sans accent) partout sur le site
58e6ec0 PWA setup + fixes: vite-plugin-pwa, SPA fallback 404.html, cleanup
```

Aucun autre commit n’a modifié ce répertoire dans l’historique local.

## 4. Comparaison historique vs nouvelle architecture

| Élément | Workflow historique (`deploy.yml`) | Nouvelle architecture (`refonte-expo`) |
|---------|-----------------------------------|--------------------------------------|
| Branche ciblée | `main` uniquement | Travail sur `refonte-expo` |
| Node.js | 20 | 24 (préparé dans ci.yml) |
| Gestionnaire de paquets | npm | pnpm@9.12.0 |
| Type d’application | Vite/PWA statique | Expo / React Native + serveur Node |
| Commande build | `npm run build` → `dist/` (HTML statique) | `esbuild server/_core/index.ts --platform=node` → `dist/` (bundle Node) |
| Variables d’environnement build | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Aucune requise pour le build serveur |
| Déploiement | GitHub Pages (`actions/deploy-pages@v4`) | Aucun déploiement |
| Tests | Non configurés | `vitest run` avec service MySQL 8 |
| TypeScript | Non configuré | `tsc --noEmit` |
| Lint | Non configuré | `eslint .` |

## 5. Cause de l’exécution historique numéro 1

**Cause : inconnue.**

Les logs d’exécution des workflows GitHub historiques ne sont pas accessibles localement, et le client `gh` n’est pas installé dans cet environnement (installation interdite par les règles). Aucune trace d’exécution n’est disponible dans le dépôt Git local. Il n’est donc pas possible d’identifier précisément la cause de l’échec de l’exécution numéro 1.

## 6. Présence du workflow CI Phase 4

Le workflow `ci.yml` (Node 24 / pnpm / MySQL) est **présent localement** dans `.github/workflows/ci.yml`, mais il est **non tracké** par Git (état `??`).

Il peut être exécuté sans déploiement car il ne contient aucune étape de déploiement. Toutefois, comme il n’est pas committed, il n’est pas disponible sur le dépôt distant et aucune exécution distante n’a été déclenchée.

## 7. Écart de compatibilité

Le workflow historique `deploy.yml` **n’est pas compatible** avec la nouvelle architecture :

- Il cible `main`, pas `refonte-expo`.
- Il utilise Node 20 + npm, pas Node 24 + pnpm.
- Il construit une application Vite/PWA statique, pas le bundle serveur Node/Expo.
- Il déploie sur GitHub Pages, ce qui n’est pas pertinent pour une application Expo/Node.
- Il n’inclut pas de tests, de typecheck, ni de lint.

## 8. Proposition de CI de validation indépendante (sans modification de fichier)

Pour valider la nouvelle architecture sans déploiement et sans modifier de fichier, exécuter localement les équivalents des jobs du workflow `ci.yml` :

1. `corepack pnpm install --frozen-lockfile`
2. `corepack pnpm exec eslint .`
3. `corepack pnpm check`
4. `corepack pnpm test` (nécessite MySQL pour les tests d’intégration ; ignorés si `BARAHUB_TEST_DATABASE_URL` absent)
5. `corepack pnpm build`

Ces commandes reproduisent les jobs lint, typecheck, test et build du workflow `ci.yml` sans aucun déploiement.

## 9. Prochaines actions

- Exécuter les 5 commandes de validation listées ci-dessus pour confirmer la reproductibilité locale.
- Si un accès à GitHub Actions est rétabli (via `gh` ou interface web), comparer les exécutions du workflow `ci.yml` avec les résultats locaux.
- Maintenir `pnpm-lock.yaml` indexé sans l’indexer davantage.
- Ne pas committer `ci.yml` ni `deploy.yml` sans autorisation explicite.
- Ne pas réactiver le workflow `deploy.yml` sur `main`.
