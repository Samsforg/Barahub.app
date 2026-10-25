# Barahub — Phase 7 : notifications in-app

## Livraison

Barahub possède désormais une table `notifications` persistante, liée à un utilisateur, avec type, titre, message, référence non sensible, date de lecture et clé de déduplication unique par utilisateur. Les notifications sont protégées par session et ne peuvent être lues ou acquittées que par leur propriétaire.

Le centre de notifications est affiché dans l’espace client et l’espace prestataire. Il rafraîchit les données toutes les 15 secondes, affiche le compteur non lu, permet de marquer une notification ou toute la file comme lue et présente un état de chargement/erreur. Cette stratégie fournit le temps réel du MVP sans service push externe ni secret dans l’application.

Événements couverts :

- Nouvelle demande compatible : notification aux professionnels vérifiés couvrant la prestation et le quartier concernés.
- Acceptation d’une mission : notification au client.
- Transition de mission (`ACCEPTED`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`) : notification au client.
- Nouvel avis : notification au prestataire concerné.
- Publication d’un avis : confirmation au client auteur.

Les clés `mission:<id>:...` et `review:<id>:...` empêchent les doublons lors des retries ou appels idempotents. Les demandes sans prestation sélectionnée ne déclenchent pas de fausse alerte compatible; elles restent disponibles pour l’affectation administrative. Les incidents de notification sont journalisés côté serveur sans annuler une création de demande ou une transition déjà validée.

## Fichiers et base

Le lot ajoute `notifications` dans `drizzle/schema.ts`, la migration `drizzle/0006_lush_nehzno.sql`, les fonctions d’émission/lecture/acquittement dans `server/db.ts`, le namespace `notifications` dans `server/routers.ts` et le composant partagé `components/notification-center.tsx`. Les écrans client et prestataire intègrent ce composant.

## Validation

`pnpm check`, `pnpm lint`, `pnpm test` et `pnpm db:push` passent. La suite compte 31 tests réussis et 1 test OAuth ignoré par le starter. Deux tests vérifient que les lectures et acquittements sont refusés sans session.

## Limites restantes

Le temps réel est un polling in-app de 15 secondes, pas une notification push native, SMS, email ou WhatsApp. Les fournisseurs externes restent à configurer. La liste affiche les 50 dernières notifications, tandis que le compteur non lu est calculé sur toute la file persistée; une pagination/archivage sera nécessaire pour un usage à grande échelle.

## Verdict

**PASS WITH LIMITATIONS** — les notifications métier persistantes, protégées et dédupliquées sont livrées pour le pilote; les canaux push externes restent volontairement en attente de configuration.
