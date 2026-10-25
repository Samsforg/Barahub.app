# Barahub - Rapport Phase 2

Date : 23 octobre 2026

## 1. Résumé

Les blocages techniques qui pouvaient être corrigés sans décision externe ont été traités :

- le secret de session est maintenant validé au démarrage en production ;
- les permissions audio, vidéo et notifications push inutilisées ont été retirées ;
- les trois erreurs ESLint ont été corrigées ;
- un workflow CI de validation sans déploiement a été ajouté ;
- l'encodage des fichiers a été vérifié ;
- l'architecture d'authentification cible et l'identité native proposée sont documentées.

L'authentification Manus, l'identité native publiée et le fournisseur d'auth cible n'ont pas été remplacés. Ils nécessitent des identifiants et une décision du propriétaire.

Aucun commit, push, pull request ou changement de `main` n'a été effectué.

## 2. Périmètre et invariants

- Branche de travail : `refonte-expo`.
- Commit de départ : `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe`.
- `main` et `origin/main` sont restés à `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe`.
- Aucun fichier n'a été indexé.
- Aucun secret réel n'a été affiché, ajouté ou modifié.
- Aucun test d'authentification ou de base de données n'a été simulé.
- La branche `refonte-expo` n'a pas d'upstream.

## 3. Lot 1 - Sécurité JWT

### 3.1 Fonctionnement constaté

- `server/_core/env.ts` résout le secret avec `MANUS_JWT_SECRET`, puis `JWT_SECRET`, puis une chaîne vide.
- `server/_core/sdk.ts` utilise ce secret pour signer et vérifier les JWT HS256.
- Les sessions sont créées avec `ONE_YEAR_MS` dans `server/_core/oauth.ts` et `server/_core/sdk.ts`.
- Un JWT contient `openId`, `appId` et `name`. Il n'a pas d'identifiant de session révocable.
- La déconnexion supprime le cookie et le jeton local, mais ne peut pas invalider un JWT déjà émis avant son expiration.

### 3.2 Correction appliquée

Nouveau module `server/_core/sessionSecret.ts` :

- validation uniquement si `NODE_ENV === "production"` ;
- refus si le secret est absent, vide, inférieur à 32 caractères, connu comme faible, composé de moins de 4 caractères distincts ou répétitif ;
- erreur générique `SessionSecretError`, sans valeur du secret ;
- aucune configuration imposée aux tests ou au développement local.

`server/_core/index.ts` :

- appelle la validation avant la création du serveur Express ;
- en cas d'échec, journalise un message générique et positionne `process.exitCode = 1`.

Le script `start` positionne déjà `NODE_ENV=production`. Un lancement direct de `node dist/index.js` sans `NODE_ENV=production` contourne volontairement cette validation.

### 3.3 Tests

`tests/session-secret.test.ts` contient 9 tests :

- absence de configuration hors production ;
- secret valide ;
- secret absent, vide, blanc, trop court, placeholder connu et caractères répétés ;
- absence du secret dans le message d'erreur.

Résultat : 9 tests réussis.

Vérification du démarrage réel avec `NODE_ENV=production`, sans `MANUS_JWT_SECRET` ni `JWT_SECRET` :

```text
[api] server failed to start: A secure session secret is required in production: configure MANUS_JWT_SECRET or JWT_SECRET with at least 32 characters.
exit=1
```

Le message ne contient pas le secret.

## 4. Lot 2 - Authentification et OAuth

### 4.1 Flux actuel

1. `app/login.tsx` affiche l'écran de connexion. Son bouton pousse actuellement vers `/oauth/callback` sans code ni state.
2. `constants/oauth.ts` contient `getLoginUrl()` et `startOAuthLogin()`, mais aucun écran ne les appelle.
3. Sur web, `getLoginUrl()` construit une URL Manus `/app-auth` avec `appId`, `redirectUri`, un state égal au redirect URI encodé en base64 et `type=signIn`.
4. Le callback web est `/api/oauth/callback`. Le serveur échange le code, récupère l'utilisateur, le synchronise en base, crée un JWT d'un an, pose un cookie et redirige vers `EXPO_WEB_PREVIEW_URL`, `EXPO_PACKAGER_PROXY_URL` ou `http://localhost:8081`.
5. Sur natif, le callback est un deep link. `app/oauth/callback.tsx` appelle `/api/oauth/mobile`, récupère `app_session_id`, le stocke dans SecureStore et stocke les informations utilisateur.
6. `/api/auth/me` accepte le cookie web ou un `Authorization: Bearer`.
7. `/api/auth/session` transforme un Bearer en cookie, notamment pour la preview.
8. `/api/auth/logout` efface le cookie ; le client efface ensuite son jeton local.
9. Les cookies sont `__Host-manus_session_227925861987873` en HTTPS et `manus_local_session_227925861987873` en HTTP local. Le cookie legacy `app_session_id` est aussi effacé.

### 4.2 Dépendances Manus

| Élément | Usage actuel |
| --- | --- |
| `MANUS_PROJECT_ID` | Identifiant d'application OAuth |
| `MANUS_OAUTH_PORTAL_URL` | Portail de connexion |
| `MANUS_OAUTH_API_URL` | Échange de code et informations utilisateur |
| `MANUS_JWT_SECRET` | Signature des sessions |
| `server/_core/oauth.ts`, `sdk.ts`, `cookies.ts` | Callback, sessions, cookies |
| `constants/oauth.ts`, `lib/_core/api.ts`, `lib/_core/auth.ts`, `app/oauth/callback.tsx` | Client OAuth et stockage local |
| `lib/_core/manus-runtime.ts` | Preview web et communication iframe |

### 4.3 Problèmes constatés

- Le bouton de connexion n'appelle pas `startOAuthLogin()` : le parcours est incomplet.
- Le state OAuth est seulement le redirect URI encodé ; il ne contient pas de nonce CSRF ni de PKCE.
- Les JWT durent un an et ne sont pas révocables.
- Le callback web redirige vers une URL de preview, pas vers une URL de production stable.
- Aucun mécanisme local de secours si Manus est indisponible.
- Le cookie et le scheme sont encore liés à Manus.
- `origin/feature/zavu-auth` contient une ancienne intégration Zavu dans `client/src/hooks/use-auth.ts` (ancien client Vite) et son commit mentionne une clé live. Cette branche ne doit pas être fusionnée telle quelle ; la clé doit être vérifiée et révoquée si elle a été exposée.

### 4.4 Architecture cible proposée

Solution recommandée, non implémentée :

- **Better Auth auto-hébergé** sur le serveur Express existant, avec l'adaptateur MySQL/Drizzle à valider.
- Connexion par email-mot de passe ou lien magique, puis Google et Apple si les identifiants sont fournis.
- OTP téléphone/WhatsApp via un fournisseur serveur, par exemple Zavu, Twilio ou Orange SMS. L'ancienne intégration Zavu ne doit pas être réutilisée côté client.
- Sessions courtes et renouvelables : cookie HTTP-only, Secure, SameSite adapté ; jeton natif dans SecureStore ; révocation côté serveur ; rotation à la connexion.
- PKCE et state signé côté serveur pour les flux OAuth.
- Cookie web `__Host-barahub_session` et stockage local `barahub_session_token` / `barahub_user_info`.
- Conservation temporaire de `/api/auth/me` et `/api/auth/logout` pour limiter les changements client.

Identifiants et décisions nécessaires, sans valeurs dans ce dépôt :

- secret Better Auth de 32 caractères minimum ;
- URL publique de l'application et URL de l'API ;
- identifiants OAuth Google et/ou Apple avec redirect URIs autorisés ;
- clé API Zavu ou autre fournisseur SMS, template OTP, expéditeur et canal ;
- SMTP ou fournisseur email si lien magique ;
- décision sur la conservation ou la migration des utilisateurs Manus existants.

Tant que ces éléments manquent, le mécanisme Manus reste en place.

## 5. Lot 3 - Identité native et encodage

### 5.1 Encodage

Un scan strict UTF-8 de 166 fichiers texte (`.ts`, `.tsx`, `.js`, `.json`, `.md`, `.css`, `.yml`, `.env.example`, etc.) n'a trouvé :

- aucun fichier UTF-8 invalide ;
- aucun caractère de remplacement U+FFFD ;
- aucune séquence de mojibake détectée.

Les accents affichés de façon incorrecte par PowerShell sont des artefacts de console ; les valeurs lues en UTF-8 sont correctes, notamment :

- `app.config.ts` : `Barahub — Services à domicile à Abidjan` ;
- `app/login.tsx` : textes français corrects ;
- `app/provider/index.tsx` : textes français corrects.

Aucun texte français n'a donc été modifié dans ce lot. Le `.gitignore` invalide avait déjà été converti en UTF-8 lors de la Phase 1.

### 5.2 Identité actuelle

- iOS bundle ID : `space.manus.barahub.t227925861987873`
- Android package : `space.manus.barahub.t227925861987873`
- Scheme : `manus227925861987873`
- Callback web actuel : `/api/oauth/callback`
- Callback natif actuel : `manus227925861987873://oauth/callback`
- Cookie : `__Host-manus_session_227925861987873`
- Clés locales : `app_session_token`, `manus-runtime-user-info`

### 5.3 Identité proposée

Proposition à confirmer par le propriétaire avant application :

- iOS bundle ID : `pro.barahub.app`
- Android package : `pro.barahub.app`
- Scheme : `barahub`
- Deep link OAuth : `barahub://oauth/callback`
- URL web cible : `https://app.barahub.pro/oauth/callback` (à confirmer selon l'hébergement)
- API cible : `https://api.barahub.pro` (à confirmer)
- Cookie web : `__Host-barahub_session`
- Cookie local : `barahub_local_session_*`
- Clés locales : `barahub_session_token`, `barahub_user_info`

Cette proposition n'a pas été appliquée. Le dépôt ne contient ni `eas.json`, ni métadonnées App Store/Google Play, ni preuve de publication native. L'ancienne application était une PWA GitHub Pages. L'identité actuelle est générée par Manus et doit rester intacte jusqu'à la migration d'auth et la confirmation des stores.

La configuration Expo a été testée après les autres modifications :

```text
EXIT=0
name=Barahub — Services à domicile à Abidjan
slug=barahub
scheme=manus227925861987873
ios_bundle=space.manus.barahub.t227925861987873
android_package=space.manus.barahub.t227925861987873
android_permissions=ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION
plugins=expo-asset, expo-router, expo-location, expo-splash-screen, expo-build-properties
```

## 6. Lot 4 - Permissions mobiles

### 6.1 Usages vérifiés

- Géolocalisation : utilisée par `components/provider-location-control.tsx` et `expo-location` pour le partage de position pendant une mission active.
- Notifications : `components/notification-center.tsx` affiche des notifications stockées en base via tRPC. Aucun import de `expo-notifications` et aucune fonctionnalité push.
- Audio et vidéo : aucun import de `expo-audio` ou `expo-video` dans le code applicatif.

### 6.2 Corrections appliquées

- suppression de la permission explicite `POST_NOTIFICATIONS` ;
- suppression des plugins `expo-audio` et `expo-video` ;
- suppression des dépendances `expo-audio`, `expo-video` et `expo-notifications` ;
- mise à jour de `pnpm-lock.yaml`.

Les paquets supprimés ajoutaient eux-mêmes des permissions natives :

- `expo-audio` : `MODIFY_AUDIO_SETTINGS` et, via son plugin, `RECORD_AUDIO` ;
- `expo-notifications` : `POST_NOTIFICATIONS` et `RECEIVE_BOOT_COMPLETED` ;
- `expo-video` : service de lecture en arrière-plan/PiP via son plugin.

Après modification, Expo ne génère plus que :

- `android.permission.ACCESS_COARSE_LOCATION` ;
- `android.permission.ACCESS_FINE_LOCATION`.

La permission de localisation reste justifiée par le partage de position d'une mission active. Aucun service de localisation en arrière-plan n'est demandé.

`expo-image` reste installé mais n'est pas utilisé ; il ne demande pas de permission et n'a pas été retiré dans ce lot.

## 7. Lot 5 - CI/CD

### 7.1 Ancien pipeline

L'ancien workflow `.github/workflows/deploy.yml` construisait l'application Vite et la déployait sur GitHub Pages avec des secrets Supabase. Il n'est pas compatible avec l'application Expo/Express/MySQL actuelle et n'a pas été restauré.

Aucun fournisseur de déploiement, hébergement API, base de production ou secret CI n'est défini dans le dépôt. Aucun déploiement n'a donc été préparé.

### 7.2 Nouveau workflow de validation

Fichier `.github/workflows/ci.yml` :

- jobs séparés `lint`, `typecheck`, `test` et `build` ;
- Node.js 22 et pnpm 9.12.0 ;
- `pnpm install --frozen-lockfile` ;
- ESLint, `tsc --noEmit`, Vitest et build serveur ;
- permissions limitées à `contents: read` ;
- aucun secret, aucun déploiement, aucune publication de store.

Le YAML a été parsé avec succès ; les jobs détectés sont `lint`, `typecheck`, `test`, `build`.

Le workflow ne pourra s'exécuter qu'après commit de `pnpm-lock.yaml` et du fichier workflow. Aucun commit n'a été fait.

## 8. Lot 6 - Qualité et tests

### 8.1 Corrections ESLint

1. `server/_core/cors.ts` : remplacement de l'accès dynamique `process.env[name]` par deux accès statiques, sans changement de comportement.
2. `hooks/use-color-scheme.web.ts` : remplacement de l'effet de setState par `useSyncExternalStore`, avec snapshot serveur `false` et snapshot client `true`.
3. `hooks/use-auth.ts` : chargement initial dérivé de `autoFetch`, démarrage asynchrone du fetch web hors du corps synchrone de l'effet et suppression du setState synchrone du cas `autoFetch=false`.
4. `package.json` : script `lint` remplacé par `eslint .`, ce qui évite la dépendance à `expo lint` et au binaire `pnpm` dans le `PATH` local.

### 8.2 Résultats

| Vérification | Résultat |
| --- | --- |
| `corepack pnpm check` | 0 erreur TypeScript |
| `corepack pnpm lint` | 0 erreur, 12 avertissements |
| `corepack pnpm test` | 76 réussis, 9 ignorés, 0 échec |
| `corepack pnpm build` | OK, `dist/index.js` 147,2 ko |
| `expo config --type public` | OK |
| `pnpm install --frozen-lockfile` | lockfile à jour |
| `git diff --check` | OK, uniquement avertissements CRLF |
| Démarrage production sans secret | échec explicite, code 1 |
| Démarrage développement + `/api/health` | HTTP 200 |

Les avertissements ESLint restants concernent du code existant : variable `ApiResponse` inutilisée, import par défaut de thème, variable `error` inutilisée, types `Array<T>`, imports inutilisés dans `seed.ts` et directive générée dans `.expo/types/router.d.ts`.

Le warning Node `MODULE_TYPELESS_PACKAGE_JSON` reste non bloquant. Ajouter `"type": "module"` sans traiter les fichiers CommonJS serait risqué et n'a pas été fait.

### 8.3 Tests ignorés

Les 9 tests ignorés viennent de deux suites d'intégration nécessitant `BARAHUB_TEST_DATABASE_URL` :

- `tests/pilot.checklist.integration.test.ts` : 5 tests ;
- `tests/pilot.multi-account.integration.test.ts` : 4 tests.

Ces suites utilisent `describe.skip` quand la variable est absente. Elles n'ont pas été transformées artificiellement en succès. Elles nécessitent une base MySQL de test isolée et migrée.

### 8.4 Tests de sécurité et d'autorisation

- `tests/session-secret.test.ts` : 9 tests ;
- `tests/cors.test.ts` : 25 tests ;
- `tests/auth.logout.test.ts` : 1 test ;
- suites d'autorisation admin, messages, notifications, avis, annulations, devis/paiements, localisation : incluses dans les 76 tests réussis.

## 9. Fichiers modifiés ou créés

Créés :

- `server/_core/sessionSecret.ts`
- `tests/session-secret.test.ts`
- `.github/workflows/ci.yml`
- `docs/phase-2-report.md`

Modifiés :

- `server/_core/index.ts`
- `server/_core/cors.ts`
- `hooks/use-auth.ts`
- `hooks/use-color-scheme.web.ts`
- `app.config.ts`
- `package.json`
- `pnpm-lock.yaml`

Non modifiés volontairement :

- `main`, les commits, l'index Git ;
- `server/_core/oauth.ts`, `sdk.ts`, `cookies.ts` et le flux Manus ;
- le bundle ID, le package Android, le scheme et les cookies ;
- les identifiants de stores ;
- le schéma de base de données et les migrations ;
- les secrets et fichiers `.env` ;
- l'ancienne application supprimée dans le worktree.

## 10. Risques et décisions en attente

### P0

- Le JWT dure un an et n'est pas révocable. La correction du secret ne remplace pas une gestion de sessions courte avec révocation.
- Le parcours de connexion visible est incomplet : le bouton de `app/login.tsx` ne lance pas `startOAuthLogin()`.
- La branche `origin/feature/zavu-auth` contient une ancienne intégration Zavu côté client et un commit mentionnant une clé live. Ne pas fusionner ; vérifier et révoquer la clé si elle a été exposée.
- L'authentification dépend entièrement de Manus.

### P1

- Le state OAuth n'a ni nonce CSRF ni PKCE.
- Le callback web dépend d'une URL de preview.
- L'identité native et les cookies sont encore Manus.
- Aucun fournisseur d'auth cible, identifiants OAuth, email ou SMS n'est configuré.
- Aucun pipeline de déploiement API/web/mobile n'existe.
- Les 9 tests d'intégration nécessitent une base de test.

### Décisions du propriétaire

1. Choisir Better Auth auto-hébergé ou un autre fournisseur.
2. Choisir les méthodes de connexion : email, Google, Apple, téléphone/WhatsApp OTP.
3. Fournir les identifiants OAuth, email et SMS, hors dépôt.
4. Confirmer la conservation ou la migration des utilisateurs Manus.
5. Confirmer l'identité `pro.barahub.app` / scheme `barahub` et les domaines de callback.
6. Confirmer si l'application native a déjà été publiée.
7. Choisir l'hébergement web/API et la stratégie de déploiement.
8. Décider du sort des modules Forge/Manus restants et de `expo-image`.

## 11. État Git final

- Branche active : `refonte-expo`
- Commit de départ : `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe`
- Index : 0 fichier indexé
- Worktree : 176 entrées
  - 143 suppressions héritées de l'ancienne application ;
  - 4 fichiers suivis modifiés (`.env.example`, `.gitignore`, `package.json`, `tsconfig.json`) ;
  - 29 entrées non suivies, dont les nouveaux modules, tests, docs et le workflow CI.

Aucun commit, push ou changement de `main`.
