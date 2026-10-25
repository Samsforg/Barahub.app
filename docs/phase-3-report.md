# Barahub - Rapport Phase 3

Date : 23 octobre 2026

## 1. Verdict

L’audit, la correction de sécurité ciblée et la consolidation technique de la refonte Expo / Express / tRPC / Drizzle sont terminés sur la branche de travail `refonte-expo`.

État de validation local final :

- TypeScript (`corepack pnpm check`) : **OK**.
- ESLint (`corepack pnpm lint`) : **0 erreur**, **13 avertissements**, **0 blocage**.
- Tests unitaires / d’autorisation (`corepack pnpm test`) : **86 réussis**, **15 fichiers de tests réussis**, **2 fichiers d’intégration ignorés**, **9 tests d’intégration ignorés**.
- Build serveur (`corepack pnpm build`) : **OK**, bundle `dist/index.js` de **147,6 ko**.
- Serveur de dev : **OK**, `/api/health` répond `{"ok":true,...}`.
- Production sans secret de session : **OK**, refus de démarrage attendu.

Le projet n’est **pas encore prêt à la publication**.

La Phase 3 aboutit à une base technique saine, avec des actions bloquées par des décisions produit, des identifiants externes, un fournisseur d’authentification ou une base de données persistée.

## 2. État Git et invariants

- Branche active : `refonte-expo`.
- Commit de base : `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe`.
- `main` et `origin/main` sont restés à ce même commit.
- Aucun commit, push, pull request, rebase, reset ou modification directe de `main` n’a été effectué.
- Aucun secret réel n’a été affiché, ajouté ou modifié.
- Aucun fichier `.env` n’existe.
- Les changements suivants sont encore présents dans le worktree :

```text
M .env.example
D .github/workflows/deploy.yml
M .gitignore
D README.md
D client/index.html
D client/public/...
D client/src/...
D package-lock.json
M package.json
D postcss.config.js
D supabase/.temp/linked-project.json
D supabase/functions/send-sms/index.ts
D supabase/schema.sql
D tailwind.config.ts
D tsconfig.node.json
D vite.config.ts
?? .github/workflows/ci.yml
?? .npmrc
?? .watchmanconfig
?? TODO.md
?? app.config.ts
?? app/
?? assets/
?? babel.config.js
?? components/
?? constants/
?? docs/
?? drizzle.config.ts
?? drizzle/
?? eslint.config.js
?? global.css
?? hooks/
?? lib/
?? metro.config.js
?? nativewind-env.d.ts
?? plan.md
?? pnpm-lock.yaml
?? public/
?? scripts/
?? server/
?? shared/
?? tailwind.config.js
?? tests/
?? theme.config.d.ts
?? theme.config.js
```

## 3. Lot 1 - Inventaire des dépendances et audit

### 3.1 Dépendances directes initiales et cibles Phase 3

La nouvelle application Expo utilise une surface de dépendances plus large que l’ancienne Vite / Supabase :

- Environ **46 dépendances de production** et **18 dépendances de développement** dans `package.json`.
- Base technique actuelle : Expo 57, React Native 0.86, Expo Router 57, React 19.2, tRPC 11, Drizzle ORM, MySQL2, Express 4, NativeWind, Tailwind.

### 3.2 Mises à jour appliquées

| Dépendance / paquet | Avant | Après |
|---|---:|---:|
| `@trpc/server`, `@trpc/client`, `@trpc/react-query` | `11.7.2` | `11.8.0` |
| `axios` | `^1.13.2` | `^1.20.0` |
| `drizzle-orm` | `^0.44.7` | `^0.45.2` |
| `mysql2` | `^3.16.0` | `^3.23.1` |
| `proxy-addr` | `2.0.8` en transitif vulnérable | `2.0.8` corrigé via `pnpm update` |
| `path-to-regexp` | `0.1.12` | `0.1.13` via override |
| `shell-quote` | `1.8.3` / vulnérable | `1.12.0` via override |
| `body-parser` | `1.20.4` | `1.20.6` via override |
| `qs` | `6.14.0` | `6.16.1` via override |

Les overrides restent dans le bloc `pnpm.overrides` du `package.json`.

### 3.3 Résultat de l’audit de sécurité

Audits exécutés avec `pnpm audit --prod` ; première passe avec une mémoire de travail augmentée, puis sortie JSON analysée.

Résultat final de la vague de mise à jour :

- **0 vulnérabilité critique**
- **30 vulnérabilités élevées**
- **11 vulnérabilités modérées**
- **2 vulnérabilités faibles**
- **0 information**
- **820 dépendances de production analysées**

Pendant la première vague, avant corrections complètes :

- **1 critique**
- **38 élevées**
- **16 modérées**
- **4 faibles**
- **48 advisories**

Après corrections ciblées :

- `@trpc/server` est passé à la version corrigée.
- Le serveur Express héberge désormais :
  - `body-parser@1.20.6`
  - `qs@6.16.1`
- Le binaire `shell-quote` est sur `1.12.0`.
- `path-to-regexp` est sur `0.1.13`.
- `proxy-addr` est sur `2.0.8`.

Les vulnérabilités restantes sont majoritairement épinglées à des outils de build / CLI Expo :

- `@xmldom/xmldom`
- `node-forge`
- `picomatch`
- `ws`
- `source-map-js`
- `browserslist`
- `js-yaml`
- `compression`
- `yaml`
- `braces`
- `@babel/core`
- `postcss-selector-parser`
- `uuid`
- `decode-uri-component`
- `baseline-browser-mapping`

Ces derniers concernent principalement les phases de build, de bundling, de lint, d’iOS/Android configuration ou du dev server Expo. Aucune n’est classée critique dans le résultat final.

## 4. Lot 2 - Authentification et sessions

### 4.1 Secret de session

État déjà corrigé en Phase 2 :

- Validation du secret serveur uniquement en production.
- Refus en cas d’absence, chaîne vide, secret trop court, secret faible, secret connu comme placeholder ou secret répétitif.
- Message d’erreur générique.
- Démarrage refusé sans secret valide en production.

### 4.2 Validation des claims JWT

Nouveau module créé :

- `server/_core/sessionClaims.ts`

Fonction :

```ts
parseSessionClaims(payload: Record<string, unknown>, expectedAppId: string): SessionClaims | null
```

Règles :

- `openId` : chaîne non vide.
- `appId` : chaîne non vide.
- `name` : chaîne, vide autorisé.
- `expectedAppId` : doit être non vide et égal au `appId` du payload.

Conséquence :

- Un JWT valide pour une autre application est rejeté.
- Un serveur sans `MANUS_PROJECT_ID` valide actuellement aucune session.
- Le nom reste une donnée non autorisant.
- L’identifiant utilisateur et l’application sont donc maintenant liés au token attendu.

### 4.3 Vérification côté SDK

`server/_core/sdk.ts` :

- Supprime l’ancien helper local.
- Importe `parseSessionClaims`.
- Utilise `parseSessionClaims(payload, ENV.appId)`.
- Journalise `[Auth] Session payload is invalid`.
- Rejette une session sans claims valides.

Comportement de synchronisation ajouté :

- Comparaison `userInfo.openId === session.openId`.
- En cas de divergence, logue et refuse avec `ForbiddenError("Session user mismatch")`.

### 4.4 Login et OAuth

`constants/oauth.ts` :

- `startOAuthLogin()` lève une erreur explicite si le login n’est pas supporté sur l’appareil.
- Lève une erreur explicite si l’ouverture de l’URL échoue.
- Documentation JSDoc mise à jour avec `@throws`.

`app/login.tsx` :

- Ajoute l’état `isStarting`.
- Ajoute le message d’erreur `errorMessage`.
- Rend la soumission asynchrone via `handleLogin`.
- Désactive le bouton pendant la redirection.
- Affiche `Redirection en cours...`.
- Affiche `Continuer vers la connexion`.
- Affiche `La connexion est momentanément indisponible. Réessayez.` en cas d’erreur.

### 4.5 Tests ajoutés

Nouveau fichier :

- `tests/session-claims.test.ts`

Contenu : **10 tests**.

Couverts :

- Token valide.
- Nom vide accepté.
- Token pour une autre application rejeté.
- Serveur sans `appId` rejetant les sessions.
- `openId` vide / absent / absent.
- `appId` vide / absent.
- Nom non string / absent.

Tests déjà existants concernés :

- `tests/session-secret.test.ts`
- `tests/auth.logout.test.ts`

Résultat global après ajout :

- **86 tests réussis**
- **9 tests ignorés**
- **2 suites d’intégration DB en `describe.skip`**

Les tests d’intégration nécessitent `BARAHUB_TEST_DATABASE_URL` et une base persistée. Aucune base MySQL n’étant disponible localement, elles restent non exécutées.

## 5. Lot 3 - Flux OAuth et identité

### 5.1 État actuel conservé

Le flux Manus est conservé tel qu’il était :

- OAuth via portail Manus.
- Échange code / state.
- Callback web `/api/oauth/callback`.
- Callback natif via `/api/oauth/mobile`.
- Cookie de session.
- Bearer token natif.
- Session locale côté client.
- Logout cookie / jeton local.
- Durée de session d’un an.

### 5.2 Changements récents

- Validation renforcée des claims.
- Vérification de cohérence entre le token utilisateur et l’identité de session.
- Erreurs OAuth plus explicites côté login.

### 5.3 Risques toujours ouverts

- State OAuth non signé côté client, absence de nonce / PKCE côté client natif.
- JWT non révocable côté serveur.
- Durée de session d’un an.
- Redirection web vers preview.
- Dépendance totale au portail Manus.
- Deep link natif basé sur un scheme lisible dans la configuration.

Décisions actuelles :

- CSRF / PKCE : documenté comme **P1**, différé.
- Révocation JWT : documenté comme **P1**, différé.
- Durée de session : documentée comme décision métier, pas modifiée arbitrairement.

## 6. Lot 4 - Base de données et tests

### 6.1 Schéma

- Migrations Drizzle : `drizzle/0000_elite_eternals.sql` à `drizzle/0012_natural_shadow_king.sql`.
- Journal de migration : `drizzle/meta/_journal.json`.
- Schéma applicatif : `drizzle/schema.ts`.
- Tables applicatives : **21 tables**.
- Migrations : **13 migrations**.

Le schéma contient notamment :

- `users`
- `categories`
- `zones`
- `services`
- `providerProfiles`
- `providerZones`
- `providerServices`
- `serviceRequests`
- `quotes`
- `payments`
- `appointments`
- `missionResponses`
- `reviews`
- `reviewReports`
- `complaints`
- `refunds`
- `adminAuditLogs`
- `notifications`
- `messages`
- `providerLocations`
- `requestStatusHistory`

### 6.2 Cohérence métier

- Idempotence sur clés métier.
- Index et contraintes checks.
- Transactions et verrous SQL.
- Règles de transition centralisées côté serveur.
- Commission de simulation configurable via `BARAHUB_COMMISSION_RATE_BPS`, défaut **1500 bps** (`15 %`).
- Le placeholder documenté dans `.env.example` a été aligné sur ce défaut.

### 6.3 Tests DB

- Aucune instance MySQL/MariaDB n’étant disponible dans l’environnement local.
- Port `3306` fermé.
- `BARAHUB_TEST_DATABASE_URL` absent.
- Suite d’intégration persistée : **non exécutée**.

Statut : **bloqué**, pas échouée.

## 7. Lot 5 - Identité native

### 7.1 Identité actuelle

- Bundle ID : `space.manus.barahub.t227925861987873`.
- Scheme : `manus227925861987873`.
- Cookie session suffixe : `227925861987873`.

### 7.2 Identité proposée, non implémentée

Propositions actuelles :

- Bundle ID / package : `pro.barahub.app`.
- Scheme : `barahub`.
- URL OAuth : `https://app.barahub.pro/oauth/callback`.
- URL API : `https://api.barahub.pro`.

Fichiers impactés pour un futur changement :

- `app.config.ts`.
- `constants/oauth.ts`.
- `server/_core/cookies.ts`.
- `shared/const.ts`.
- `lib/_core/auth.ts`.
- `lib/_core/api.ts`.
- `app/oauth/callback.tsx`.

### 7.3 Statut

- Modification non appliquée.
- Publication native non prouvée.
- Aucun `eas.json`, dossier iOS natif complet ou métadonnées de store détectés.
- Ancienne application restait une PWA / GitHub Pages / Supabase au commit de base.

## 8. Lot 6 - CI et exploitation

### 8.1 Workflow CI

Workflow actuellement présent :

- `.github/workflows/ci.yml`.

Jobs :

- `lint`
- `typecheck`
- `test`
- `build`

Outils :

- pnpm `9.12.0`
- Node `22`
- `pnpm install --frozen-lockfile`
- Permissions `contents: read`

Limites :

- Le workflow n’inclut pas d’audit de dépendances.
- Le workflow n’inclut pas de service MySQL.
- Les tests d’intégration DB sont donc exclus de la CI actuelle.
- Les jobs CI n’ont pas été exécutés sur GitHub dans cet environnement.

### 8.2 Blocage technique identifié

Le workflow utilise `pnpm install --frozen-lockfile`.

Le lockfile `pnpm-lock.yaml` est **présent localement mais non suivi par Git**.

Conséquence :

- **CI en checkout propre : bloquée tant que le lockfile n’est pas versionné.**

Action requise avant merge :

- commiter `pnpm-lock.yaml`.

Aucun commit n’a été effectué, conformément aux consignes.

## 9. Risques et décisions ouvertes

### P0

1. Aucune validation réelle d’OAuth Manus.
2. Aucun OAuth natif réel validé.
3. Aucun fournisseur de secours.
4. Identité native encore liée à Manus.
5. Aucune base de test disponible localement.

### P1

1. PKCE / nonce / state renforcé.
2. Révocation des JWT.
3. Durée de session.
4. Identité Barahub.
5. Publication native.
6. Commission / configuration produit.
7. Lockfile CI.

### P2

1. Tests d’intégration DB.
2. Audit dépendances résiduel à couvrir par des outils de build.
3. Avertissements lint préexistants.

## 10. Prochaines étapes recommandées

1. Valider les corrections de dépendances résiduelles si un chemin de build est réellement exécuté.
2. Configurer une base de test MySQL/MariaDB et exécuter les suites d’intégration.
3. Obtenir les identifiants Manus OAuth réels, le provider cible et les secrets.
4. Décider de la migration vers une authentification native.
5. Versionner `pnpm-lock.yaml`.
6. Lancer les jobs GitHub Actions après versionnement du lockfile.
7. Préparer les flux OAuth natifs réels.
8. Valider la publication Expo / stores.
9. Effectuer un nouveau scan de sécurité après upgrades restants.
10. Rédiger le rapport final et attendre les décisions produit avant toute publication.

## 11. Verdict final Phase 3

**État local : prêt pour la continuation technique.**

**État global : bloqué avant publication.**

La sécurité de base des sessions JWT a été renforcée, le login OAuth a été rendu fonctionnel côté UI, les tests unitaires et la build sont verts, et les mises à jour de sécurité critiques ont été appliquées.

La Phase 3 ne doit pas être considérée comme terminée opérationnellement tant que :

- les tests d’intégration ne sont pas exécutés,
- les flux OAuth réels ne sont pas validés,
- l’identité de production n’est pas décidée,
- les secrets ne sont pas configurés,
- le lockfile n’est pas versionné,
- l’audit résiduel n’est pas clôturé.
