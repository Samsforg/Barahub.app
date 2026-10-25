# Barahub — Phase 9 : messagerie client-prestataire

## Livraison

Barahub propose une conversation privée liée à chaque demande déjà affectée à un prestataire. Le client et le prestataire peuvent lire les messages et envoyer des consignes de coordination depuis leurs espaces respectifs. Les nouveaux messages déclenchent une notification in-app côté destinataire.

Les messages sont persistés dans `messages` avec expéditeur, destinataire, commande, contenu, date de lecture et clé d’idempotence. L’accès est dérivé côté serveur depuis la commande : aucun rôle, identifiant de participant ou destinataire fourni par le navigateur n’est accepté comme source d’autorité. Une conversation n’est ouverte que pour un participant réel et les statuts affectés/confirmés jusqu’à la réclamation; une demande non affectée reste sans chat.

## Sécurité et fiabilité

Les procédures `messages.list`, `messages.send` et `messages.markRead` sont protégées. Le serveur vérifie le client propriétaire ou le prestataire affecté, limite le texte à 2 000 caractères, déduplique un retry avec `idempotencyKey`, ne place aucune adresse ou coordonnée dans le message automatique et marque comme lu seulement les messages reçus par l’utilisateur courant.

Le rafraîchissement se fait toutes les 5 secondes lorsque l’espace est visible et s’arrête en arrière-plan. Il s’agit d’un chat in-app à polling court, pas d’un WebSocket ni d’une notification push; cela évite d’ajouter une infrastructure temps réel coûteuse au pilote.

## Validation

`pnpm check`, `pnpm lint`, `pnpm test`, `pnpm db:push` et `pnpm db:seed` passent. La suite comprend 37 tests réussis et 1 test ignoré préexistant; les tests dédiés refusent lecture, envoi et acquittement sans session. La migration `drizzle/0009_ambitious_the_captain.sql` crée la table, les index, les clés étrangères et le type de notification `message`.

## Limites restantes

La messagerie ne remplace pas WhatsApp Business, les SMS ou les notifications push. Les pièces jointes, photos dans le chat, accusés de réception détaillés, recherche et modération automatique sont hors périmètre MVP. Les tests d’intégration avec deux comptes persistés restent à compléter avant un déploiement pilote élargi.

## Verdict

**PASS WITH LIMITATIONS** — conversation privée persistante et idempotente livrée avec autorisations serveur et polling visible; temps réel réseau natif, pièces jointes et push restent hors périmètre.
