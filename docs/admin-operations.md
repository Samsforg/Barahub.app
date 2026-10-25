# Opérations administrateur Barahub

Ce guide décrit l’usage du tableau de bord `/admin` livré pour le pilote. Toutes les procédures sont protégées côté serveur par `adminProcedure` : le rôle est lu depuis la session, jamais depuis une valeur envoyée par le client.

## Accès

1. Se connecter avec un compte dont le rôle `users.role` vaut `admin`.
2. Ouvrir `/admin` depuis l’espace compte.
3. Un compte `user` reçoit `FORBIDDEN` même s’il connaît l’URL ; un visiteur sans session est refusé.

## Vérification d’un prestataire

Onglet **Prestataires**.

- Un nouveau profil reste `pending` et n’apparaît pas dans les affectations automatiques ou manuelles.
- **Vérifier** passe le profil à `verified`, enregistre `verifiedBy`/`verifiedAt` et notifie le prestataire.
- **Suspendre** passe à `suspended` : le prestataire ne peut plus recevoir de nouvelle mission ni accepter une mission. L’historique est conservé.
- **Remettre en attente** repasse à `pending` si le dossier doit être repris.
- Chaque décision écrit une ligne `provider.<statut>` dans `adminAuditLogs` et une notification in-app.

## Affectation manuelle

Onglet **Demandes**.

Une demande peut être affectée manuellement uniquement si :

- elle est au statut `REQUESTED` et sans prestataire ;
- le prestataire est `verified` ;
- il couvre la commune et le quartier de la demande via une zone active ;
- il propose la prestation demandée.

L’affectation verrouille la demande en transaction, passe le statut à `ASSIGNED`, écrit l’historique, le journal admin et notifie le client et le prestataire. Une demande déjà affectée est refusée.

## Catalogue

Onglet **Catalogue**, trois sections.

### Catégories

- Nom obligatoire, slug généré automatiquement (accents et séparateurs normalisés).
- Une catégorie inactive reste en base mais n’est plus proposée au catalogue public.
- L’ordre d’affichage est contrôlé par `sortOrder`.

### Prestations

- Nom, description (10 caractères minimum) et catégorie obligatoires.
- `fixed` exige un prix positif en FCFA.
- `quote` interdit un prix fixe.
- Un diagnostic obligatoire interdit le prix fixe.
- Durée indicative : 1 à 720 minutes.
- Les champs déplacement, fournitures exclues et sécurité sont informatifs.

### Zones

- Couple commune/quartier unique.
- Une zone inactive n’est plus utilisée pour les affectations ni le catalogue public.
- Le slug de catégorie/prestation est unique et normalisé côté serveur.

Chaque création/modification écrit `catalog.<type>.create|update` dans `adminAuditLogs`.

## Réclamations

Onglet **Réclamations**. Le client peut ouvrir une réclamation depuis **Mes demandes** pour une demande `ASSIGNED` à `REVIEWED`.

États :

- `open` : reçue, demande passée en `CLAIM_OPEN` avec mémorisation du statut précédent ;
- `in_progress` : prise en charge ;
- `resolved` : clôture positive ;
- `dismissed` : clôture après vérification.

Règles :

- une seule réclamation active par demande ;
- une réclamation clôturée ne peut plus être rouverte ;
- la clôture restaure le statut précédent de la demande (`COMPLETED` par défaut) ;
- client et prestataire affecté reçoivent une notification dédupliquée ;
- chaque transition écrit `complaint.<statut>` dans le journal admin.

Le client ne voit que ses propres réclamations ; une tentative d’ouverture sur la demande d’un autre compte est refusée.

## Remboursements

Onglet **Remboursements**.

1. Choisir un paiement `confirmed` sans remboursement existant.
2. Saisir un motif (5 à 1200 caractères) et créer la demande : la demande passe en `REFUND_PENDING`.
3. **Confirmer** passe le remboursement à `completed`, le paiement à `refunded` et la demande à `REFUNDED`.
4. **Rejeter** passe le remboursement à `rejected` et restaure le statut précédent de la demande.

Contraintes :

- un paiement ne peut avoir qu’un seul remboursement (index unique) ;
- seuls les paiements `confirmed` sont remboursables ;
- les statuts de demande autorisés sont `QUOTE_ACCEPTED`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `REVIEWED`, `CLAIM_OPEN` ;
- l’ancien bouton qui passait directement un paiement à `refunded` a été retiré ;
- aucune opération réelle Mobile Money n’est déclenchée : le remboursement est un enregistrement métier du pilote.

## Journal et notifications

- `adminAuditLogs` conserve l’administrateur, l’action, l’entité, l’identifiant et la note.
- Les notifications utilisent des clés de déduplication et ne contiennent ni adresse précise ni coordonnée sensible.
- Les erreurs de notification sont journalisées sans annuler l’opération métier.

## Limites du pilote

- Pas de paiement réel, de WhatsApp Business, d’e-mail transactionnel ni de push natif.
- Pas de téléversement de justificatifs : la vérification repose sur la revue humaine et une note.
- Pas de paramétrage général du taux de commission dans l’interface (variable d’environnement `BARAHUB_COMMISSION_RATE_BPS`).
- Les remboursements sont des décisions admin, sans passerelle bancaire.
