# Audit de migration Expo — Barahub

- **Date** : 2026-10-23
- **Branche** : `refonte-expo`
- **Commit de référence** : `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe`
- **Périmètre** : audit de la refonte Expo/React Native, corrections ciblées, vérifications. Aucun commit, push ou changement de `main`.

## 1. Verdict

La nouvelle application Expo compile, le serveur démarre et les tests non persistés passent. La migration technique Vite/Supabase → Expo/tRPC/Drizzle/MySQL est structurée et cohérente.

La publication reste toutefois bloquée par des sujets de sécurité, d'identité et de décision produit :

- `MANUS_JWT_SECRET` peut être vide sans empêcher le démarrage du serveur.
- L'identité native (`space.manus.*`), le scheme (`manus*`) et les cookies de session restent liés à Manus.
- L'authentification dépend entièrement du portail OAuth Manus.
- Plusieurs permissions mobiles ne sont pas justifiées par le code actuel.
- Le pipeline GitHub Pages a été supprimé sans remplacement.
- Le lint direct échoue sur 3 erreurs préexistantes.
- L'OAuth réel, le mobile et le déploiement n'ont pas été validés.

L'ancienne application Vite/Supabase est supprimée dans le worktree mais reste récupérable depuis `HEAD`. Elle n'a pas été restaurée.

## 2. État Git au moment de l'audit

- Branche active : `refonte-expo`.
- `main` et `origin/main` sont au même commit `8d6e328`, intact.
- Aucun upstream pour `refonte-expo`, aucune branche distante `origin/refonte-expo`.
- `origin/feature/zavu-auth` existe à `b2bef73`.
- Aucun stash, aucun sous-module, aucun conflit, un seul worktree.
- État initial : 143 fichiers suivis supprimés, 3 modifiés, 0 indexé, 30 entrées non suivies. Après ajout des règles d'ignore : 28 entrées non suivies.
- Le diff des fichiers suivis représente 146 fichiers, 188 insertions et 9 194 suppressions.
- `package-lock.json` est supprimé, `pnpm-lock.yaml` est nouveau et non suivi.
- Les suppressions ne sont pas indexées. Aucun `git add`, commit ou push n'a été effectué.

Fichiers suivis modifiés après l'audit : `.env.example`, `.gitignore`, `package.json`, `tsconfig.json`.

## 3. Architecture migrée

| Couche | Ancienne application (`HEAD`) | Nouvelle application |
|---|---|---|
| Interface | React 18 + Vite | Expo 57 + React Native 0.86 + Expo Router 57 |
| Web | Vite + Wouter | Metro + `react-native-web` |
| Style | Tailwind CSS + PostCSS | NativeWind + Tailwind |
| API | Supabase | Express 4 + tRPC 11 |
| Base | Supabase PostgreSQL | MySQL + Drizzle ORM |
| Auth | Supabase Auth | OAuth Manus + JWT de session |
| PWA | `vite-plugin-pwa` | `public/manifest.webmanifest` + `public/sw.js` |
| Déploiement | GitHub Pages | Aucun pipeline de remplacement |

Points d'entrée :

- Client : `app/_layout.tsx`
- API : `server/_core/index.ts` → `server/routers.ts`
- Base : `server/db.ts`, `drizzle/schema.ts`
- Configuration Expo : `app.config.ts`

Routes Expo actuelles :

- `app/(tabs)/index.tsx`
- `app/(tabs)/requests.tsx`
- `app/(tabs)/profile.tsx`
- `app/login.tsx`
- `app/request.tsx`
- `app/request/saved.tsx`
- `app/service/[slug].tsx`
- `app/provider/index.tsx`
- `app/admin/index.tsx`
- `app/support.tsx`
- `app/oauth/callback.tsx`
- `app/dev/theme-lab.tsx`

## 4. Dépendances Manus

| Zone | Rôle | Usage constaté | Statut | Action |
|---|---|---|---|---|
| `server/_core/oauth.ts`, `sdk.ts`, `cookies.ts`, `types/manusTypes.ts` | OAuth, JWT, cookies, appels Manus | Routes `/api/oauth/callback`, authentification des requêtes | **Actif** | Ne pas retirer sans fournisseur d'auth de remplacement |
| `constants/oauth.ts`, `lib/_core/auth.ts`, `lib/_core/api.ts`, `app/oauth/callback.tsx` | Connexion client, stockage de session | Login web/native, deep link | **Actif** | Lié au scheme et au portail Manus |
| `lib/_core/manus-runtime.ts` + `app/_layout.tsx` | Preview web dans un iframe | `postMessage`, safe-area, aucun secret | **Actif conditionnel** | Isolable ; utile seulement en preview web |
| `server/_core/storageProxy.ts` | Proxy `/manus-storage/*` vers Forge | Enregistré dans l'API | **Actif conditionnel** | Aucun appel client trouvé ; à retirer ou remplacer avec le stockage |
| `server/_core/systemRouter.ts`, `notification.ts` | Notification propriétaire via Forge | Procédure admin `system.notifyOwner` | **Actif conditionnel** | Aucun appel client trouvé ; décision produit requise |
| `server/storage.ts`, `server/_core/imageGeneration.ts` | Stockage et génération d'image Forge | `storage.ts` n'est importé que par `imageGeneration.ts` | **Mort** | Candidats à suppression après décision stockage |
| `server/_core/heartbeat.ts` | Jobs Forge | Aucun import externe | **Mort** | Candidat à suppression |
| `server/_core/dataApi.ts` | Appels Data API | Aucun import externe | **Mort** | Candidat à suppression |
| `server/_core/llm.ts` | Appels LLM | Aucun import externe | **Mort** | Candidat à suppression |
| `server/_core/voiceTranscription.ts` | Transcription audio | Aucun import externe | **Mort** | Candidat à suppression |
| `server/_core/env.ts` | Variables Manus/DB | Lu par l'API | **Actif** | À découpler avec l'auth |
| `server/_core/cors.ts` | CORS des previews Expo | `EXPO_PACKAGER_PROXY_URL`, `EXPO_WEB_PREVIEW_URL` | **Actif** | Dépendance de preview, pas de Manus au sens strict |

L'identité Manus reste aussi présente dans :

- `app.config.ts` : `space.manus.barahub.t227925861987873` et scheme `manus227925861987873`.
- `constants/oauth.ts` : duplicate du bundle ID et du scheme.
- `server/_core/cookies.ts` : cookies `__Host-manus_session_*` et `manus_local_session_*`.
- `constants/oauth.ts` : clé locale `manus-runtime-user-info`.

Ces éléments ne doivent pas être renommés sans traiter la continuité de session, les redirections OAuth et l'identité des stores.

## 5. Variables d'environnement

### Requises pour l'API actuelle

- `DATABASE_URL` : connexion MySQL/Drizzle.
- `MANUS_PROJECT_ID` : identifiant d'application OAuth.
- `MANUS_OAUTH_API_URL` : API OAuth Manus.
- `MANUS_JWT_SECRET` : signature des sessions.
- `MANUS_OAUTH_PORTAL_URL` : portail de connexion utilisé par le client.
- `PORT` et `NODE_ENV` : exécution du serveur.

### Optionnelles

- `EXPO_PUBLIC_API_BASE_URL` : URL publique de l'API.
- `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` : stockage, notifications, modules Forge.
- `BARAHUB_COMMISSION_RATE_BPS` : paramètre métier.
- `BARAHUB_TEST_DATABASE_URL` : tests d'intégration persistés.
- `EXPO_PACKAGER_PROXY_URL`, `EXPO_WEB_PREVIEW_URL` : CORS des previews Expo.

### Alias legacy encore acceptés

- `VITE_APP_ID`
- `VITE_OAUTH_PORTAL_URL`
- `OAUTH_SERVER_URL`
- `JWT_SECRET`

Ces alias ne sont plus documentés dans `.env.example`. Ils restent lus par `server/_core/env.ts`, `app.config.ts` et `scripts/load-env.js`.

### Exposition publique

`app.config.ts` ne place dans `extra` que les URLs OAuth, l'identifiant d'application et l'URL d'API. Aucun secret serveur n'a été trouvé dans la configuration Expo publique.

Les mappings publics de `OWNER_OPEN_ID` et `OWNER_NAME` ont été retirés : ils n'étaient pas utilisés et exposaient inutilement des informations d'identité dans le bundle.

`.env.example` a été remplacé : il ne contient plus l'ancienne configuration Supabase et n'inclut aucune valeur secrète réelle.

## 6. Sécurité et risques

### P0 — avant toute publication

1. **Secret de session vide accepté.** `server/_core/env.ts` retourne `""` si `MANUS_JWT_SECRET` et `JWT_SECRET` sont absents. `sdk.ts` signe et vérifie ensuite les JWT avec ce secret vide. Le serveur démarre malgré tout. Il faut faire échouer le démarrage en production ou imposer un secret fort.
2. **Auth unique Manus.** Aucun mécanisme local de secours. Une indisponibilité du portail bloque toutes les connexions.
3. **Identité native Manus.** Bundle ID, package Android, scheme et cookies sont encore liés à Manus. Leur changement impacte OAuth, deep links, sessions et stores.

### P1 — avant bêta publique

4. **Permissions non justifiées.** La configuration génère `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `POST_NOTIFICATIONS`, `FOREGROUND_SERVICE` et `FOREGROUND_SERVICE_MEDIA_PLAYBACK`. Le code n'importe ni `expo-audio`, ni `expo-video`, ni `expo-notifications`.
5. **Permissions justifiées.** La localisation est réellement utilisée dans `app/request.tsx` et `components/provider-location-control.tsx`.
6. **Pipeline de déploiement supprimé.** `.github/workflows/deploy.yml` est supprimé et aucun workflow de remplacement n'existe.
7. **Documentation d'exploitation supprimée.** `README.md` est supprimé et n'a pas de remplacement à la racine.
8. **Fonction SMS supprimée.** `supabase/functions/send-sms/index.ts` est supprimé. Aucun code SMS/OTP/téléphone n'existe dans la nouvelle application.
9. **Lint en échec.** 3 erreurs préexistantes subsistent (voir section 9).

### P2 — qualité et exploitation

10. **Warning ESM Node.** `dist/index.js` est chargé comme ESM sans `"type": "module"`. Ajouter ce champ casserait les configurations CommonJS (`babel.config.js`, `metro.config.js`, `tailwind.config.js`). Le warning est non bloquant.
11. **`.gitignore` était en Windows-1252.** Le fichier n'était pas UTF-8 valide. Il a été converti en UTF-8.
12. **Sauvegardes locales non ignorées.** `.gitignore.backup-*` et `.manus-starter-init.json` sont maintenant ignorés.
13. **`.npmrc` et `.watchmanconfig` non suivis.** À décider : les versionner ou les documenter comme configuration locale.

Aucun fichier `.env` n'est présent. Le scan de secrets est propre après exclusion des placeholders de documentation.

## 7. Permissions mobiles

| Permission / plugin | Source | Usage réel | Recommandation |
|---|---|---|---|
| Localisation précise/approximative | `expo-location` | Oui, demande et suivi de mission | Conserver |
| `POST_NOTIFICATIONS` | `app.config.ts` | Non : centre de notifications interne uniquement | Retirer sauf si push prévu |
| Microphone / `RECORD_AUDIO` | plugin `expo-audio` | Non | Retirer sauf si audio prévu |
| `MODIFY_AUDIO_SETTINGS` | plugin `expo-audio` | Non | Retirer sauf si audio prévu |
| Lecture en arrière-plan / PiP | plugin `expo-video` | Non | Retirer sauf si vidéo prévue |
| `FOREGROUND_SERVICE*` | plugins audio/vidéo | Non | Retirer avec les plugins concernés |

Les dépendances `expo-notifications`, `expo-audio`, `expo-video` et `expo-image` n'ont aucun import direct. Certaines dépendances sans import direct (`expo-asset`, `expo-font`, `expo-splash-screen`, `expo-build-properties`) restent utilisées par la configuration ou les plugins et ne doivent pas être supprimées sans vérification.

## 8. Ancienne application et fonctionnalités perdues

L'ancienne application suivie dans `HEAD` comprenait :

- `client/src/pages/Home.tsx`, `Search.tsx`, `ArtisanDetail.tsx`, `Login.tsx`, `Register.tsx`, `Profile.tsx`
- `client/src/lib/supabase.ts`
- `supabase/schema.sql`
- `supabase/functions/send-sms/index.ts`
- `README.md`
- `.github/workflows/deploy.yml`
- `vite.config.ts`, `package-lock.json`, `postcss.config.js`, `tailwind.config.ts`, `tsconfig.node.json`

La nouvelle application couvre davantage de parcours métier (demandes, prestataire, admin, suivi, messagerie). En revanche :

- l'authentification par téléphone/SMS n'a pas d'équivalent ;
- le déploiement GitHub Pages n'a pas d'équivalent ;
- le README et le domaine `barahub.pro` ne sont plus documentés dans le dépôt ;
- l'ancienne documentation Supabase n'est plus applicable.

La PWA a été reprise : `public/manifest.webmanifest`, `public/sw.js`, `public/manus-routes.json` et `app/+html.tsx`. Les tests de contrat PWA passent.

## 9. Vérifications exécutées

`pnpm` n'est pas dans le `PATH` de ce shell, mais `corepack pnpm` fonctionne avec la version épinglée `9.12.0`.

| Commande | Résultat |
|---|---|
| `corepack pnpm check` | **OK**, exit 0 |
| `corepack pnpm test` | **OK**, 67 réussis, 9 ignorés, 0 échec |
| `corepack pnpm test` avec `BARAHUB_TEST_DATABASE_URL` | Non exécuté dans cet audit ; dernier passage connu : 76 réussis, 0 ignoré |
| `corepack pnpm build` | **OK**, exit 0, `dist/index.js` 145,9 ko |
| `npm run start` avec `PORT=3108` | **OK**, `/api/health` répond 200 |
| `node dist/index.js` avec `PORT=3107` | **OK**, `/api/health` répond 200 |
| `expo config --type public` | **OK**, exit 0 |
| `corepack pnpm exec eslint .` | **ÉCHEC**, 3 erreurs, 12 avertissements |
| `npm run lint` | N'a pas exécuté ESLint : `expo lint` a tenté d'appeler `pnpm`, absent du `PATH` |
| Scan UTF-8 strict | **OK** après correction ; seul `.gitignore` était invalide |
| Scan de secrets | **Propre** après exclusion des placeholders |
| `git diff --check` | **OK**, uniquement des avertissements CRLF |

Erreurs ESLint préexistantes :

- `hooks/use-auth.ts:100` — `react-hooks/set-state-in-effect`
- `hooks/use-color-scheme.web.ts:11` — `react-hooks/set-state-in-effect`
- `server/_core/cors.ts:10` — `expo/no-dynamic-env-var`

Le démarrage sans variables OAuth produit le message attendu `[OAuth] ERROR: OAUTH_SERVER_URL is not configured`. Cela confirme que le serveur démarre mais que la connexion n'est pas configurée.

`docs/pilot-preparation.md` annonce un lint sans erreur. Cette affirmation ne correspond plus à l'état actuel du lint direct.

## 10. Corrections ciblées appliquées

1. `package.json`
   - `name` : `app-template` → `barahub`.
   - `start` : remplacé par `cross-env NODE_ENV=production node dist/index.js`, compatible Windows.

2. `.env.example`
   - Ancienne configuration Supabase supprimée.
   - Variables serveur, OAuth, Expo public, options Forge et tests documentées sans secret.

3. `.gitignore`
   - Converti de Windows-1252 en UTF-8.
   - Commentaire `clés privées` corrigé.
   - `.gitignore.backup-*` et `.manus-starter-init.json` ignorés.

4. `app.config.ts`
   - Champ `logoUrl` non utilisé supprimé. Il pointait vers `files.manuscdn.com`.
   - L'icône locale `assets/images/icon.png` reste utilisée.
   - Aucun changement de bundle ID, package Android, scheme ou permission.

5. `scripts/load-env.js`
   - Imports et variables ESM inutilisés retirés.
   - Mappings publics `OWNER_OPEN_ID` et `OWNER_NAME` retirés.

6. `constants/oauth.ts`
   - Exports inutilisés `OWNER_OPEN_ID` et `OWNER_NAME` retirés.
   - Aucun changement du flow OAuth ni du scheme.

Aucun changement n'a été apporté à `main`, aux migrations, au schéma, aux cookies, aux routes OAuth ou aux fichiers supprimés de l'ancienne application.

## 11. Décisions humaines requises

1. **Fournisseur d'authentification cible** : conserver Manus, migrer vers Better Auth/Neon Auth, Supabase Auth ou autre.
2. **Continuité de session** : conserver les cookies `manus_*` ou forcer une déconnexion lors du renommage.
3. **Identité native** : nouveau bundle ID et scheme `barahub`, avec impact sur OAuth, deep links, stores et éventuelle nouvelle application.
4. **SMS/OTP** : faut-il restaurer l'ancienne fonction `send-sms` ou conserver uniquement l'OAuth ?
5. **Stockage/notifications/IA** : supprimer les modules Forge morts ou les remplacer.
6. **Permissions** : retirer audio/vidéo/notifications non utilisés avant publication.
7. **Hébergement** : cible du serveur Express/MySQL et remplacement du pipeline GitHub Pages.
8. **Lint** : corriger les 3 erreurs ou documenter une exception justifiée.

## 12. Plan de migration recommandé

### Phase 1 — Débloquer une publication contrôlée

- Imposer `MANUS_JWT_SECRET` en production.
- Décider de l'identité native et du fournisseur d'auth.
- Retirer les permissions et plugins non utilisés.
- Corriger les 3 erreurs ESLint.
- Recréer un README et un pipeline CI/CD.
- Statuer sur SMS/OTP et sur les modules Forge.

### Phase 2 — Découpler Manus sans casser les sessions

- Remplacer OAuth/session ou documenter le maintien de Manus.
- Traiter les cookies `manus_session_*` avec une période de transition.
- Remplacer le stockage Forge si une fonctionnalité de fichiers est conservée.
- Retirer `manus-runtime` du web hors preview.
- Supprimer les modules morts après validation.

### Phase 3 — Données et déploiement

- Conserver les 13 migrations Drizzle et le schéma MySQL.
- Valider une restauration de sauvegarde sur une base de recette.
- Déployer l'API et le web statique avec les variables d'environnement hors dépôt.
- Remplacer GitHub Pages par la cible retenue.

### Phase 4 — Validation finale

- `check`, lint, tests unitaires et tests persistés.
- Build Expo web, Android et iOS.
- OAuth web et deep link natif.
- Parcours client, prestataire et admin.
- PWA installable et service worker.
- Test de démarrage sans secret pour vérifier l'échec attendu.

## 13. Commandes de reprise

```powershell
git branch --show-current
git rev-parse HEAD
git status --short
corepack pnpm check
corepack pnpm test
corepack pnpm build
corepack pnpm exec eslint .
```

Aucun commit ni push ne doit être effectué avant validation explicite du propriétaire.
