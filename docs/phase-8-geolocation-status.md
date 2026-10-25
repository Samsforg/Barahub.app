# Barahub — Phase 8 : géolocalisation et suivi prestataire

## Livraison

Le client peut joindre une position GPS facultative à une demande. L’application demande explicitement l’autorisation de localisation au premier plan et affiche une précision indicative; le formulaire reste utilisable sans GPS.

Un prestataire vérifié peut partager sa position uniquement pour une mission qui lui est attribuée et dont le statut est `SCHEDULED` ou `IN_PROGRESS`. Le partage est déclenché par un bouton explicite, rafraîchi toutes les 30 secondes pendant que l’espace prestataire est ouvert et arrêté explicitement ou lors du démontage de l’écran. Les coordonnées ne sont jamais rendues publiques.

Le client propriétaire d’une demande peut consulter le suivi uniquement pour sa propre mission. La position du prestataire est retournée seulement pendant `SCHEDULED`/`IN_PROGRESS` et seulement lorsque le prestataire a choisi `shared`; les autres utilisateurs, prestataires non affectés et demandes d’autres clients sont refusés côté serveur.

Une carte légère mobile-first affiche la position du client et, lorsqu’elle est partagée, celle du prestataire sur un repère Abidjan. Elle évite toute clé cartographique côté navigateur et ne prétend pas fournir une navigation routière. Une intégration cartographique routière pourra être branchée plus tard via le proxy Maps de la plateforme, sans exposer de secret.

## Base et fichiers

Le lot ajoute `providerLocations` et la migration `drizzle/0007_silky_trish_tilby.sql`, puis les contraintes de coordonnées dans `drizzle/0008_bumpy_satana.sql`. Il étend `serviceRequests` avec l’écriture de latitude/longitude facultatives et ajoute les procédures `requests.tracking` et `provider.location.update`. Les composants `location-map.tsx`, `customer-tracking-card.tsx` et `provider-location-control.tsx` sont intégrés aux espaces client/prestataire. `expo-location` est ajouté comme dépendance native.

Les coordonnées sont validées dans Zod, dans la couche DB et par des contraintes SQL de paire/bornes. La table conserve une dernière position par mission tant que le partage est actif, avec précision et date d’actualisation; une contrainte unique empêche plusieurs lignes concurrentes pour la même mission. L’arrêt du partage supprime la dernière position; la fin de l’intervention la purge également.

## Validation

`pnpm check` et `pnpm lint` passent après correction du nettoyage du partage GPS. Les tests d’autorisation couvrent l’accès anonyme aux deux endpoints de localisation ainsi que la paire de coordonnées; la migration est générée et appliquée. La carte est conçue pour les petits écrans, le polling s’arrête en arrière-plan et le partage ne fonctionne qu’au premier plan.

## Limites restantes

Le suivi est un rafraîchissement de position au premier plan, pas du suivi en arrière-plan ni une notification push. La carte est une représentation schématique et non une carte routière détaillée; aucun service de géocodage, itinéraire ou carte externe n’est activé tant que les capacités Maps ne sont pas configurées/nécessaires. Les tests avec deux utilisateurs et une base persistée restent à compléter.

## Verdict

**PASS WITH LIMITATIONS** — la collecte et le partage GPS sont facultatifs, protégés et bornés à la mission active; la cartographie routière et le suivi arrière-plan restent hors périmètre MVP.
