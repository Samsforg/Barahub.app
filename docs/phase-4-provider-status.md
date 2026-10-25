# Barahub — Phase 4 : espace prestataire et missions

## Phase terminée

- Profil prestataire créé ou mis à jour avec nom affiché, présentation, compétences, disponibilités, services proposés et zones couvertes.
- Nouveau profil toujours `pending`; seul un profil `verified` peut consulter les missions compatibles ou répondre à une mission.
- Profil `suspended` exclu des nouvelles missions et des réponses.
- Missions disponibles filtrées côté serveur par services sélectionnés et couple commune/quartier couvert.
- Refus enregistré par prestataire et idempotence protégée par clés uniques; un refus ne réapparaît pas pour le même prestataire.
- Acceptation protégée par transaction, vérification de compatibilité et mise à jour conditionnelle `REQUESTED → ASSIGNED`.
- Transitions prestataire contrôlées côté serveur : `ASSIGNED → ACCEPTED → SCHEDULED → IN_PROGRESS → COMPLETED`.
- Coordonnées détaillées et adresse ne sont retournées que pour une mission déjà affectée au prestataire.

## Fichiers modifiés

- `drizzle/schema.ts`
- `drizzle/0002_sticky_sway.sql`
- `server/db.ts`
- `server/routers.ts`
- `app/provider/index.tsx`
- `app/(tabs)/profile.tsx`
- `TODO.md`

## Base de données

La migration ajoute `providerServices`, `missionResponses`, l’état `ACCEPTED` et un index prestataire/statut. `pnpm db:push` ne signale plus de migration en attente et `pnpm db:seed` reste idempotent.

## Tests exécutés

- `pnpm check` : PASS.
- `pnpm lint` : PASS.
- `pnpm test` : PASS, 25 tests passés et 1 test OAuth ignoré par le starter.
- Requête anonyme `provider.me` : refus tRPC `UNAUTHORIZED`.
- `GET /api/health` : HTTP 200.
- Catalogue tRPC : 3 prestations retournées.
- Captures mobiles de `/(tabs)/profile` et `/provider` en 390×844.

## Sécurité et limites

Le rôle utilisateur n’est pas modifié pour créer un profil prestataire et aucun statut de vérification n’est accepté dans la requête client. Les flux de devis, paiements, commissions, affectation administrative et journal d’audit restent à livrer. La vérification réelle d’un prestataire nécessite encore l’espace administration.

## Verdict

**PASS WITH LIMITATIONS** — l’espace prestataire et les missions compatibles sont fonctionnels côté modèle/API/UI, mais la validation administrative, les devis et les paiements ne sont pas encore disponibles.
