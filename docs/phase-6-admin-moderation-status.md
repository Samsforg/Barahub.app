# Barahub — Phase 6 : administration des avis et signalements

## Livraison

Un espace `/admin` mobile-first est disponible uniquement pour les utilisateurs dont le rôle serveur est `admin`. Le client ne peut pas s’octroyer ce rôle : `adminProcedure` vérifie le rôle dans le contexte serveur pour chaque lecture et chaque mutation.

L’administration affiche les avis avec leur référence de demande, note, commentaire, client, prestataire et statut. Elle permet de publier, signaler (`flagged`) ou masquer (`hidden`) un avis, puis de le rétablir. Les avis masqués ou signalés restent traçables mais sont exclus de la moyenne prestataire.

Les utilisateurs authentifiés peuvent signaler un avis depuis l’espace prestataire. Un même utilisateur ne peut signaler deux fois le même avis et ne peut pas signaler son propre avis. L’administration affiche les signalements avec motif, détail, référence, avis concerné et statut; elle peut les traiter ou les écarter.

Chaque action de modération et de résolution est enregistrée dans `adminAuditLogs` avec l’administrateur, l’action, l’entité, l’identifiant et une note. Les mutations admin sont transactionnelles et contrôlent l’existence de l’avis ou du signalement.

## Base et fichiers

Le lot ajoute `reviewReports` et `adminAuditLogs` dans `drizzle/schema.ts`, avec migration `drizzle/0005_friendly_rick_jones.sql`. Il étend `server/db.ts` et `server/routers.ts`, ajoute `app/admin/index.tsx`, l’accès conditionnel dans `app/(tabs)/profile.tsx`, le bouton de signalement dans `app/provider/index.tsx` et propage le rôle dans la session client OAuth.

## Validation

`pnpm check`, `pnpm lint`, `pnpm test` et `pnpm db:push` passent. La suite compte 29 tests passés et 1 test OAuth ignoré par le starter. Les tests admin vérifient qu’un utilisateur régulier ne peut ni consulter la file ni exécuter une mutation de modération.

## Limites restantes

Le dashboard admin couvre la modération des avis et signalements demandée ici; les autres écrans d’administration (professionnels, justificatifs, commandes, devis, paiements, statistiques) restent ouverts. Les tests d’intégration avec une session réellement admin et des avis persistés nécessitent un scénario de données de test dédié; aucun faux avis n’a été injecté dans les données partagées.

## Verdict

**PASS WITH LIMITATIONS** — l’interface avis/signalements est protégée, auditable et livrée; l’administration globale de la plateforme reste à construire.
