# Barahub — Phase 5 : MySQL, CI distante et clôture des blocages

Date : 23 octobre 2026

## 1. Résumé exécutif

Phase 5 a été exécutée à partir de la référence `docs/phase-4b-report.md`.

État global :

- **Phase 5 : PARTIELLEMENT VALIDÉE**
- TypeScript, ESLint, tests unitaires et build locaux : OK.
- Lockfile local : validé et indexé uniquement via `git add -- pnpm-lock.yaml`.
- MySQL local : indisponible.
- CI distante : non exécutée.
- OAuth réel : bloqué par configuration externe.
- Aucun commit, push ou déploiement effectué.

## 2. Lot 1 — Préflight Git

Commandes exécutées :

- `git branch --show-current` → `refonte-expo`.
- `git status --short` → état volumineux avec modifications locales et non indexées.
- `git diff --cached --name-status` → `A pnpm-lock.yaml`.
- `git diff --cached --check` → OK.
- `git log -1 --oneline` → `8d6e328 Graceful fallback when no SMS number configured`.

Vérifications :

- Seul le lockfile est indexé dans l’index actif.
- Le lockfile est non ignoré.
- Le lockfile est présent localement.
- Aucun autre fichier ajouté à l’index.
- Aucun commit créé.

## 3. Lot 2 — MySQL local

Inspections réalisées :

- `package.json` : scripts `db:push`, `db:seed`, `test`.
- `drizzle.config.ts` : dialecte MySQL, obligatoire `DATABASE_URL`.
- Tests d’intégration : conditionnés par `BARAHUB_TEST_DATABASE_URL`.
- Aucun service MySQL/MariaDB local détecté.
- Port `3306` fermé.
- Commandes `docker`, `mysqld`, `mariadb` indisponibles.
- `BARAHUB_TEST_DATABASE_URL` absent.

Conclusion :

- MySQL n’est pas disponible localement.
- Les tests d’intégration ne peuvent pas être exécutés.
- Aucune base de production n’a été utilisée.

Procédure si MySQL devient disponible :

1. Démarrer MySQL 8 ou MariaDB.
2. Créer une base isolée, par exemple `barahub_test`.
3. Définir `DATABASE_URL` et `BARAHUB_TEST_DATABASE_URL`.
4. Appliquer les migrations avec `corepack pnpm exec drizzle-kit migrate`.
5. Exécuter les tests ciblés puis la suite complète.

## 4. Lot 3 — CI distante

Workflow inspecté localement :

- `.github/workflows/ci.yml` : présent localement, non commité, avec Node 24, pnpm 9.12, install frozen, MySQL 8, base `barahub_test`, healthcheck, migration, tests, build.
- `.github/workflows/deploy.yml` : présent localement et marqué supprimé dans l’index/worktree.

Commandes Git vérifiées :

- Workflow CI : présent localement, non tracké.
- Workflow de déploiement : tracké puis supprimé localement.

Vérification GitHub :

- Commande `gh` indisponible dans l’environnement local.
- CI distante non exécutée.
- Aucun push effectué.

Conclusion :

- CI distante réellement réussie : non.
- Configuration locale du workflow : préparée.

## 5. Lot 4 — Inventaire Manus

Dépendances/actifs identifiés :

- Authentification et sessions Manus : actif.
  - `server/_core/sdk.ts`
  - `server/_core/oauth.ts`
  - `server/_core/cookies.ts`
  - `server/_core/types/manusTypes.ts`
  - `server/_core/env.ts`
  - `lib/_core/auth.ts`
  - `lib/_core/api.ts`
  - `app/_layout.tsx`
  - `app/login.tsx`
  - `app/oauth/callback.tsx`
  - `constants/oauth.ts`
  - `scripts/load-env.js`
  - `shared/const.ts`

- Runtime web preview Manus : actif.
  - `lib/_core/manus-runtime.ts`

- Intégrations optionnelles / Forge : conditionnelles.
  - Stockage, notifications, LLM, data API, image generation, voice transcription, heartbeat.

- Modules morts identifiés : data API, LLM, image generation, voice transcription, heartbeat, stockage via Forge, notification via Forge.

Décision :

- Aucune suppression automatique.
- Aucune migration OAuth automatique.

## 6. Lot 5 — OAuth

Fournisseur actuel :

- Manus OAuth.

Endpoints principaux :

- Portail : `${MANUS_OAUTH_PORTAL_URL}/app-auth`.
- Échange : `${MANUS_OAUTH_API_URL}/webdev.v1.WebDevAuthPublicService/ExchangeToken`.
- Utilisateur : `${MANUS_OAUTH_API_URL}/webdev.v1.WebDevAuthPublicService/GetUserInfo`.
- JWT user : `${MANUS_OAUTH_API_URL}/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`.

Callbacks :

- Web : `/api/oauth/callback`.
- Native : deep link via scheme Manus, callback via `/api/oauth/mobile`.

Variables requises :

- `MANUS_PROJECT_ID`
- `MANUS_OAUTH_API_URL`
- `MANUS_OAUTH_PORTAL_URL`
- `MANUS_JWT_SECRET`
- `EXPO_PUBLIC_APP_ID`
- `EXPO_PUBLIC_OAUTH_PORTAL_URL`
- `EXPO_PUBLIC_OAUTH_SERVER_URL`
- `EXPO_PUBLIC_API_BASE_URL`

Conclusion :

- OAuth réel non validé.
- Identifiants réels absents.
- OAuth bloqué par configuration externe, sans invention de credentials.

## 7. Lot 6 — Rapport et statut

Rapport Phase 5 créé : `docs/phase-5-report.md`.

Blocages résiduels :

- MySQL local indisponible.
- CI distante non exécutée.
- OAuth réel non configuré.
- Identité de production non validée.
- Audit résiduel non clos.

Statut final obligatoire :

- **PHASE 5 PARTIELLEMENT VALIDÉE**

## 8. Commandes finales

Commandes exécutées dans le cadre de Phase 5 :

- `git branch --show-current`
- `git status --short`
- `git diff --cached --name-status`
- `git diff --cached --check`
- `git log -1 --oneline`
- Contrôles MySQL.
- Inspection CI locale.
- Vérification GitHub via commande indisponible.

## 9. Conclusion

Phase 5 est **partiellement validée** :

- Préflight Git : OK.
- Lockfile : OK et indexé proprement.
- MySQL local : bloqué par indisponibilité.
- CI distante : préparée localement, non exécutée.
- OAuth : bloqué par configuration externe.

Aucun commit, push ou déploiement n’a été effectué.
