# Barahub — Phase 4 : CI reproductible, MySQL de test et audit des dépendances

Date : 23 octobre 2026

## 1. Résumé exécutif

La Phase 4 a été engagée avec un précontrôle obligatoire, puis les lots 1 à 6 ont été explorés.

État réellement atteint localement :

- Branche : `refonte-expo`.
- Commit de base : `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe`.
- TypeScript : OK.
- ESLint : 0 erreur, 13 avertissements.
- Tests unitaires : 86 réussis, 9 tests d’intégration ignorés.
- Build serveur : OK, `dist/index.js` de 147,6 ko.
- Serveur de dev : OK, `/api/health` OK.
- Secret de session en production : OK, refus attendu sans secret.

Lot 1 :

- `pnpm-lock.yaml` existe, est non ignoré et non suivi.
- `corepack pnpm install --frozen-lockfile` réussit.
- pnpm local : `9.12.0`.
- Node local : `v24.19.0`.
- `.npmrc` : `node-linker=hoisted`.
- Absence de `pnpm-workspace.yaml`.

Lot 2 :

- Aucun service MySQL/MariaDB local détecté.
- Port `3306` fermé.
- Commandes `docker`, `mysqld`, `mariadb` indisponibles localement.
- `BARAHUB_TEST_DATABASE_URL` absent.

Lot 3 :

- Les deux suites d’intégration persistées sont conditionnées par `BARAHUB_TEST_DATABASE_URL`.
- `tests/pilot.checklist.integration.test.ts` : 5 tests ignorés.
- `tests/pilot.multi-account.integration.test.ts` : 4 tests ignorés.
- Total : 9 tests ignorés.

Lot 4 :

- Inventaire Manus réalisé.
- Authentification, OAuth, stockage, notifications, LLM, data API, heartbeat identifiés comme actifs ou conditionnels.

Lot 5 :

- Checklist OAuth rédigée.
- Aucun identifiant réel inventé.
- Validation réelle bloquée par absence d’identifiants.

Lot 6 :

- Workflow CI mis à jour : Node version aligné sur `24`, job Tests enrichi d’un service MySQL 8 et d’une migration avant les tests.

## 2. État initial et préflight

Commandes exécutées :

- `git branch --show-current` → `refonte-expo`.
- `git log -1 --oneline` → `8d6e328 Graceful fallback when no SMS number configured`.
- `git ls-files pnpm-lock.yaml` → aucune ligne, donc non suivi.
- `git check-ignore -v pnpm-lock.yaml` → non ignoré.
- `node --version` → `v24.19.0`.
- `corepack pnpm --version` → `9.12.0`.

Observations :

- Branche correcte.
- Base de travail intacte au niveau du commit.
- Lockfile présent mais à versionner.
- `.npmrc` utilise `node-linker=hoisted`.
- Pas de `pnpm-workspace.yaml`.

## 3. Lot 1 — Lockfile et CI reproductible

### 3.1 Lockfile

- `pnpm-lock.yaml` existe.
- Il est non ignoré.
- Il n’est pas suivi par Git.
- Il est synchronisé avec `package.json` au moment des vérifications locales.
- `corepack pnpm install --frozen-lockfile` réussit.

### 3.2 Configuration pnpm

- `packageManager` : `pnpm@9.12.0`.
- Overrides appliqués :
  - `body-parser@1.20.6`
  - `path-to-regexp@0.1.13`
  - `qs@6.16.1`
  - `shell-quote@1.12.0`
- Builds autorisés : `esbuild`, `unrs-resolver`.

## 4. Lot 2 — Base MySQL de test

- Aucun serveur MySQL local disponible.
- Aucune base dédiée locale créée.
- Aucun credential de base utilisé.
- Les tests persistés restent désactivés tant que `BARAHUB_TEST_DATABASE_URL` n’est pas fourni.

Procédure locale recommandée :

```text
BARAHUB_TEST_DATABASE_URL=mysql://<user>:<password>@127.0.0.1:3306/barahub_test
```

Procédure CI ajoutée :

```yaml
services:
  mysql:
    image: mysql:8
    env:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: barahub_test
    ports:
      - 3306:3306
    options: >-
      --health-cmd="mysqladmin ping -h localhost -proot"
      --health-interval=10s
      --health-timeout=5s
      --health-retries=10
```

Variables CI ajoutées :

```text
BARAHUB_TEST_DATABASE_URL=mysql://root:root@127.0.0.1:3306/barahub_test
DATABASE_URL=mysql://root:root@127.0.0.1:3306/barahub_test
```

## 5. Lot 3 — Tests d’intégration

### 5.1 Checklist

Fichier : `tests/pilot.checklist.integration.test.ts`.

Tests :

1. Crée des entrées cataloguelles et refuse un prix fixe avec diagnostic obligatoire.
2. Affecte uniquement des prestataires vérifiés couvrant la zone et la prestation.
3. Refuse une réponse de mission d’un prestataire suspendu.
4. Refuse une seconde réclamation active et restaure le statut précédent.
5. Restaure le statut précédent lorsqu’un remboursement est rejeté.

### 5.2 Multi-account

Fichier : `tests/pilot.multi-account.integration.test.ts`.

Tests :

1. Vérifie un prestataire et affecte une demande manuellement.
2. Ouvre une réclamation sans l’exposer à un autre client.
3. Restaure le statut de la demande lors de la résolution d’une réclamation.
4. Crée et finalise un remboursement une seule fois.

### 5.3 État

- Base locale : absente.
- Tests : `describe.skip`.
- Résultat local : 9 tests non exécutés.

## 6. Lot 4 — Inventaire des dépendances Manus

### 6.1 Authentification et sessions

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

Statut : actif pour le flux OAuth actuel.

### 6.2 Runtime web preview

- `lib/_core/manus-runtime.ts`

Statut : actif pour la preview web.

### 6.3 Intégrations optionnelles / Forge

- `server/_core/storageProxy.ts`
- `server/storage.ts`
- `server/_core/notification.ts`
- `server/_core/systemRouter.ts`
- `server/_core/dataApi.ts`
- `server/_core/llm.ts`
- `server/_core/imageGeneration.ts`
- `server/_core/voiceTranscription.ts`
- `server/_core/heartbeat.ts`

Statut : conditionnel ou mort selon les imports identifiés.

## 7. Lot 5 — Credentials OAuth

État actuel :

- Fournisseur : Manus OAuth.
- Variables requises côté serveur :
  - `MANUS_PROJECT_ID`
  - `MANUS_OAUTH_API_URL`
  - `MANUS_JWT_SECRET`
  - `MANUS_OAUTH_PORTAL_URL`
- Variables publiques côté client :
  - `EXPO_PUBLIC_APP_ID`
  - `EXPO_PUBLIC_OAUTH_PORTAL_URL`
  - `EXPO_PUBLIC_OAUTH_SERVER_URL`
  - `EXPO_PUBLIC_API_BASE_URL`
- Secrets serveur : `MANUS_JWT_SECRET`.

Points bloquants :

- Identifiants OAuth réels absents.
- Secrets réels absents.
- Validation OAuth réelle impossible.
- Aucun identifiant n’a été inventé.

## 8. Lot 6 — Workflow CI

Workflow modifié : `.github/workflows/ci.yml`.

Jobs :

- `lint`
- `typecheck`
- `test`
- `build`

Modifications apportées :

- Node version alignée sur `24`.
- Job `test` :
  - ajout service MySQL 8 ;
  - ajout base `barahub_test` ;
  - ajout healthcheck ;
  - ajout `BARAHUB_TEST_DATABASE_URL` ;
  - ajout migration avant tests.

Le workflow n’inclut pas de déploiement.

Le workflow n’inclut pas de secret réel.

Le YAML a été parsé avec succès.

## 9. Lot 7 — Validations et résultats

Validations réellement exécutées :

- `corepack pnpm check` : OK.
- `corepack pnpm lint` : 0 erreur, 13 avertissements.
- `corepack pnpm test` : 86 tests réussis, 9 ignorés.
- `corepack pnpm build` : OK, 147,6 ko.
- Serveur dev : OK.
- Production sans secret : refus attendu.

Audit final des dépendances :

- Critique : 0.
- Haute : 30.
- Modérée : 11.
- Faible : 2.
- Dépendances analysées : 820.

Audit résiduel :

- Principalement lié à des outils de build, CLI Expo, lint, bundling ou dev server.
- Corrections critiques déjà appliquées.

## 10. Blocages et étapes manuelles

Bloquants actuels :

- Validation des tests persistés impossible localement.
- CI GitHub pas encore exécuté.
- Lockfile non versionné.
- OAuth réel non configuré.
- Identité native/publiée non validée.
- Audit résiduel non remédié.

Étapes manuelles recommandées :

1. Versionner `pnpm-lock.yaml`.
2. Exécuter le workflow CI.
3. Configurer une base de test locale dédiée.
4. Obtenir les identifiants OAuth réels.
5. Finaliser l’audit résiduel.
6. Valider les flux OAuth.

## 11. Commandes de reprise

```bash
git branch --show-current
git status --short
git log -1 --oneline
git ls-files -- pnpm-lock.yaml
git check-ignore -v pnpm-lock.yaml
node --version
corepack pnpm --version
corepack pnpm install --frozen-lockfile
corepack pnpm check
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

## 12. Conclusion

Phase 4 est **partiellement validée**.

Ce qui est confirmé :

- Préflight.
- Lockfile reproductible localement.
- Workflow CI structuré.
- Base de test MySQL ajoutée au workflow.
- Inventaire Manus.
- Validations locales de base.

Ce qui reste bloqué ou à confirmer :

- Tests persistés.
- CI GitHub.
- OAuth réel.
- Identité de production.
- Audit résiduel.

Verdict final Phase 4 : **PHASE 4 PARTIELLEMENT VALIDÉE**.
