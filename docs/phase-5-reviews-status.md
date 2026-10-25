# Barahub — Phase 5 : notation et avis clients

## Livraison

Barahub permet maintenant à un client authentifié de noter une intervention terminée de 1 à 5 étoiles et d’ajouter un commentaire facultatif. L’avis est proposé dans l’historique client uniquement pour une demande `COMPLETED` sans avis existant.

La mutation serveur vérifie l’identité du client, la propriété de la demande, l’existence d’un prestataire affecté et le statut `COMPLETED`. La création de l’avis et la transition `COMPLETED → REVIEWED` sont réalisées dans une transaction avec une entrée d’historique. Une contrainte unique empêche plusieurs avis pour la même demande; un avis existant n’est jamais modifié par le client.

Les prestataires vérifiés voient leur moyenne et le nombre d’avis publiés dans leur espace. Les avis `flagged` ou `hidden` sont exclus de cette synthèse afin de préparer la modération administrative.

## Fichiers et base

Le lot modifie `drizzle/schema.ts`, `server/db.ts`, `server/routers.ts`, `app/(tabs)/requests.tsx`, `app/provider/index.tsx` et ajoute `drizzle/0003_majestic_slipstream.sql`, `drizzle/0004_remarkable_wendigo.sql`, ainsi que `tests/reviews.authorization.test.ts`. La table `reviews` contient la demande, le client, le prestataire, la note, le commentaire, le statut de modération et les dates; un index unique impose un avis maximum par demande et une contrainte SQL borne la note de 1 à 5.

## Validation

`pnpm check`, `pnpm lint`, `pnpm test` et `pnpm db:push` passent. La suite compte 27 tests passés et 1 test OAuth ignoré par le starter. Les tests ajoutés confirment qu’un appel anonyme est refusé et qu’une note hors intervalle est rejetée avant accès à la base.

## Limites restantes

Le signalement d’un avis et la modération depuis l’espace administration restent à implémenter. Les tests d’intégration avec un compte client réel, une commande `COMPLETED` et un prestataire vérifié nécessitent un scénario d’authentification dédié; aucun faux compte ni faux avis n’a été injecté dans les données partagées.

## Verdict

**PASS WITH LIMITATIONS** — le parcours client de notation après intervention est sécurisé et livré; la modération administrative reste ouverte.
