# Barahub — Compte rendu des phases 1 à 3

## Phase 1 — Fondations, conventions et accès

- **Phase terminée :** fondations UI, navigation client, thème, structure tRPC/Drizzle et raccordement du starter OAuth conservés.
- **Fichiers modifiés :** `theme.config.js`, `app/(tabs)/_layout.tsx`, `app/_layout.tsx` déjà existant réutilisé, `constants/oauth.ts`, `lib/_core/api.ts`, `server/db.ts`, `server/routers.ts`.
- **Base de données :** table `users` conservée ; migrations métier additives générées sans suppression.
- **Tests exécutés :** `pnpm check`, `pnpm lint`, `pnpm test`, healthcheck API/Metro.
- **Sécurité :** les procédures sensibles utilisent `protectedProcedure`; le rôle vient de l’utilisateur serveur résolu par la session, pas d’un champ client. Les secrets ne sont pas ajoutés au bundle.
- **Performance :** aucun service externe requis pour le catalogue ; API et Preview restent sur les ports fixes du starter.
- **Problèmes restants :** OAuth réel dépend de la configuration Webdev ; les écrans professionnel/admin et le journal d’audit métier restent à implémenter.
- **Prochaine phase :** compléter les permissions admin/prestataire et les erreurs métier.
- **Verdict :** **PASS WITH LIMITATIONS**.

## Phase 2 — Design system et pages publiques

- **Phase terminée :** accueil mobile-first, recherche locale, catégories, cartes de prestations, page détail, support, conditions/confidentialité et formulaire de demande en français avec FCFA.
- **Fichiers modifiés :** `app/(tabs)/index.tsx`, `app/(tabs)/requests.tsx`, `app/(tabs)/profile.tsx`, `app/service/[slug].tsx`, `app/support.tsx`, `app/login.tsx`, `app/request.tsx`, `app/request/saved.tsx`.
- **Base de données :** catalogue affiché depuis les prestations actives persistées ; les valeurs de démonstration seedées sont explicitement fictives et limitées au pilote.
- **Tests exécutés :** captures mobile 390×844 sur `/`, `/(tabs)/requests`, `/request`, vérification de l’absence de débordement visible.
- **Sécurité :** aucune adresse précise, document ou donnée privée dans les pages publiques ; le bouton support n’envoie aucun message réel.
- **Performance :** cartes légères, pictogrammes natifs et fallback local contrôlé si le catalogue n’est momentanément pas disponible.
- **Problèmes restants :** photos, filtres de zones persistants et manifeste/cache PWA avancés restent à traiter.
- **Prochaine phase :** renforcer le formulaire, l’historique et les devis côté serveur/client.
- **Verdict :** **PASS WITH LIMITATIONS**.

## Phase 3 — Modèle métier et demandes

- **Phase terminée :** tables `categories`, `zones`, `services`, `providerProfiles`, `providerZones`, `serviceRequests` et `requestStatusHistory`; seed idempotent de 5 catégories, 5 zones et 3 prestations; procédures `catalog.list`, `catalog.zones`, `requests.create`, `requests.mine`.
- **Fichiers modifiés :** `drizzle/schema.ts`, `drizzle/0001_rainy_invaders.sql`, `drizzle/meta/*`, `server/db.ts`, `server/routers.ts`, `server/seed.ts`, `package.json`.
- **Base de données :** `pnpm db:push` exécuté avec succès, `pnpm db:seed` idempotent et terminé proprement. Les demandes ont une référence non sensible et une clé d’idempotence par client.
- **Tests exécutés :** requête HTTP directe `catalog.list` retournant 3 prestations, healthcheck `/api/health`, `pnpm check`, `pnpm lint`, `pnpm test`.
- **Sécurité :** création/liste des demandes protégées; les prestations à diagnostic obligatoire ne retournent pas de prix fixe; aucun faux paiement ni secret financier.
- **Performance :** index de catégorie et d’état client, index d’historique, sélection catalogue paginable dans la couche DB à compléter pour les très gros volumes.
- **Problèmes restants :** transitions serveur complètes, devis immuables, affectation vérifiée/hors zone, commissions, paiements déclaratifs, notifications et administration ne sont pas encore livrés.
- **Prochaine phase :** espace professionnel puis administration et workflow complet des commandes/devis.
- **Verdict :** **PASS WITH LIMITATIONS**.
