# TODO — Barahub MVP

## [x] Baseline du starter et audit initial
- Le projet est initialisé dans Webdev avec Expo Router / React Native / TypeScript / NativeWind, Express/tRPC et Drizzle.
- Le dépôt généré est la source de vérité actuelle ; aucun dépôt métier antérieur n’était monté dans le Sandbox.
- `pnpm db:push` a été exécuté et n’a détecté aucune migration en attente.
- Les diagnostics TypeScript sont enregistrés par Webdev.

## [~] Fondations et identité Barahub
- Préserver les identifiants Expo, le scheme et les bundles générés ; remplacer l’écran d’exemple sans régénérer le starter.
- Appliquer le design « Atelier ivoirien contemporain », avec interface en français, palette contrastée, boutons tactiles, états chargement/erreur/succès/vide et aucun débordement horizontal sur petits écrans.
- Conserver Manus OAuth et les contrôles de session du starter ; le rôle doit être résolu côté serveur et non accepté depuis une requête cliente.
- Ajouter une documentation `.env.example`/configuration sans secret si une variable applicative est nécessaire.

**Évidence actuelle :** thème, navigation, tRPC/Drizzle et résolution dynamique de l’API sont en place; OAuth réel et espaces admin/prestataire restent ouverts.

## [~] Catalogue public et zones du pilote
- Permettre la consultation du catalogue, la recherche par nom/catégorie et le filtrage par zone d’intervention.
- Démarrer avec plomberie, électricité, climatisation, ménage et entretien, petites réparations domestiques ; ne pas activer de catégorie sans couverture réelle configurée.
- Administrer les catégories et prestations sans modifier le code.
- Une prestation définit nom, description, catégorie, prix fixe ou devis, durée indicative facultative, déplacement, zones, fournitures exclues, consignes de sécurité et statut actif/inactif.
- Ne jamais afficher de prix fixe quand un diagnostic est obligatoirement nécessaire.
- Les communes/quartiers couverts proviennent de la configuration et de la disponibilité réelle des professionnels.

**Évidence actuelle :** catalogue persistant et seed idempotent en place; 3 prestations et 5 zones fictives sont chargées pour le pilote, sans prétendre à une couverture commerciale.

## [~] Demande et espace client
- Permettre la création d’une demande avec description, photos facultatives, commune, quartier, repère, adresse facultative, position GPS facultative et créneau souhaité.
- Ne pas rendre la géolocalisation obligatoire et ne pas dépendre d’un service cartographique payant. La position GPS client est facultative; un prestataire vérifié peut partager sa dernière position uniquement pour une mission qui lui est affectée en `SCHEDULED` ou `IN_PROGRESS`, et le client ne peut la lire que pour sa propre demande.
- Permettre consultation/acceptation/refus des devis, suivi du statut, historique, annulation selon règles, coordonnées du professionnel seulement quand autorisé, évaluation après prestation terminée, signalement et assistance.
- Un client authentifié peut publier une note de 1 à 5 étoiles et un commentaire facultatif uniquement pour sa demande `COMPLETED`; l’avis fait passer la demande à `REVIEWED` et ne peut pas être modifié par le client.
- Prévenir les doubles soumissions et indiquer clairement si une demande n’a pas été transmise.
- Un client ne peut pas lire ou modifier la commande d’un autre client ni confirmer le paiement d’une autre personne. Le suivi GPS est protégé par propriétaire de demande et n’expose une position prestataire que lorsque le partage explicite est actif.

**Évidence actuelle :** création/liste protégées et idempotence par client; GPS facultatif, suivi client de mission active et stockage contrôlé de la dernière position sont en place; formulaire d’avis, contrôle serveur `COMPLETED`, transaction `COMPLETED → REVIEWED` et unicité par demande sont en place. Le créneau souhaité, l’annulation client et les notifications d’annulation sont ajoutés; photos, modification de créneau et tests croisés persistés restent ouverts.

## [~] Espace professionnel
- Permettre création de compte, profil, compétences, catégories, zones, disponibilités, prestations et tarifs.
- Un compte nouvellement créé n’apparaît pas comme vérifié avant validation administrative.
- Un professionnel suspendu ne peut pas recevoir ni accepter de nouvelle mission.
- Permettre réception des demandes compatibles, acceptation/refus, création/envoi de devis, consultation des rendez-vous, mise à jour du statut d’intervention, historique, évaluations, commissions et règles.
- Afficher au prestataire vérifié sa moyenne et le nombre d’avis publiés; exclure les avis signalés ou masqués de la synthèse.
- Ne jamais attribuer une commande à un professionnel non vérifié ou hors zone couverte. Le prestataire peut partager sa position au premier plan toutes les 30 secondes uniquement pour sa mission active et peut arrêter le partage.

**Évidence actuelle :** profil prestataire, services/zones, statut pending/verified/suspended, missions compatibles, acceptation/refus idempotents, transitions `ASSIGNED → ACCEPTED → SCHEDULED → IN_PROGRESS → COMPLETED`, émission de devis et annulation prestataire sont implémentés; la vérification administrative des profils est livrée dans `/admin` (vérifier, suspendre, remettre en attente, note et journal). La gestion complète des disponibilités reste ouverte.

## [~] Administration
- Protéger un tableau de bord pour clients, professionnels, justificatifs/statuts de vérification, catégories, prestations, zones, réservations, devis, paiements, commissions, réclamations, avis signalés, annulations, remboursements pris en charge, statistiques et paramètres.
- L’espace `/admin` livré liste les avis et signalements, permet de publier/signaler/masquer/rétablir un avis, de traiter ou écarter un signalement et journalise chaque action sensible côté serveur. L’accès est refusé à tout rôle autre que `admin`.
- Permettre l’affectation manuelle d’une demande pendant le pilote.
- Autoriser côté serveur et journaliser toutes les actions administratives sensibles. Les actions de modération et de résolution des signalements sont inscrites dans `adminAuditLogs`; la vérification des professionnels, commandes, paiements et autres actions admin reste ouverte.
- Un utilisateur ne peut pas devenir administrateur en modifiant son rôle dans une requête ou son profil.

**Évidence actuelle :** `/admin` couvre désormais la vérification/suspension des prestataires, l’affectation manuelle contrôlée (prestataire vérifié, prestation et zone compatibles), le CRUD des catégories/prestations/zones, les réclamations client et les remboursements. Chaque action sensible écrit dans `adminAuditLogs`; les transitions réclamation/remboursement sont centralisées dans `server/workflows.ts`. Les paiements ne peuvent plus être marqués `refunded` directement : le remboursement passe par une demande puis une décision admin. Les paramètres généraux et les justificatifs de vérification restent ouverts.

## [x] Rapports et analyses administrateur
- Proposer dans `/admin` un onglet d’analyse protégé par `adminProcedure`, avec période sélectionnable de 7, 30 ou 90 jours et états de chargement, erreur, absence de données et reprise.
- Afficher uniquement des indicateurs calculés à partir des données persistées : demandes reçues, demandes terminées, taux de complétion, demandes actives, nouveaux utilisateurs, prestataires par statut, avis publiés et moyenne, signalements ouverts, répartition par statut, évolution quotidienne, services demandés et zones les plus actives.
- Calculer les agrégats côté serveur avec bornes de période, requêtes groupées et nombres normalisés; ne jamais accepter un rôle, un périmètre ou un total fourni par le client.
- Signaler explicitement les métriques non disponibles, notamment le chiffre d’affaires et les paiements tant que le module de paiement n’est pas livré; ne pas afficher de faux compteurs ni de fausses tendances.

**Évidence actuelle :** procédure `admin.analytics`, écran mobile `AdminAnalyticsPanel`, agrégations SQL groupées et test d’autorisation livrés. Validation finale : `pnpm check`, `pnpm lint`, `pnpm test` (39 réussis, 1 ignoré), `pnpm db:push`; la requête quotidienne est compatible avec `only_full_group_by`. Les revenus et paiements étaient explicitement non affichés avant le lot suivant.

## [~] Commandes, devis, annulations et paiements déclaratifs
- Valider côté serveur les transitions et enregistrer l’historique : DRAFT → REQUESTED → ASSIGNED/ACCEPTED → QUOTE_PENDING si nécessaire → QUOTE_ACCEPTED → SCHEDULED → IN_PROGRESS → COMPLETED → REVIEWED, avec refus, annulation, échec, réclamation et remboursement selon le cas.
- Distinguer demande de rendez-vous et rendez-vous confirmé ; prévenir les doubles réservations de créneaux exclusifs.
- Un devis accepté ne peut pas être modifié silencieusement et ne peut être accepté que par l’acteur autorisé.
- Prévoir une commission configurable, avec valeur de simulation initiale 15 %, sans la présenter comme définitive ; ne pas la comptabiliser deux fois.
- Configurer espèces, Mobile Money et prestataire externe après intégration ; distinguer mode choisi, paiement déclaré, confirmé, échoué et remboursé.
- Ne jamais prétendre qu’un paiement externe a réussi sur une simple redirection ; ne stocker ni PIN, ni mot de passe financier, ni carte.
- Autoriser l’annulation client avant le démarrage, l’annulation prestataire avant le démarrage et l’annulation administrative selon les statuts opérationnels; refuser une annulation d’une demande terminée ou déjà remboursée.
- Enregistrer chaque annulation dans l’historique de statut, journaliser l’action administrative et notifier les acteurs concernés sans exposer d’adresse précise.
- Confirmer un rendez-vous uniquement avec un créneau futur; calculer une fenêtre à partir de la durée du service ou de 60 minutes par défaut.
- Empêcher deux rendez-vous confirmés qui se chevauchent pour un même prestataire par verrouillage transactionnel de sa ligne et vérification d’intervalle; autoriser deux créneaux adjacents.
- Libérer le créneau à l’annulation et ne jamais contourner les contrôles lors d’une affectation administrative.

**Avancement Phase 11/12 :** tables `quotes`, `payments` et `appointments`, historique `QUOTE_PENDING → QUOTE_ACCEPTED`, devis versionnés et idempotents, acceptation/refus client, déclaration de paiement protégée par propriétaire, rapprochement admin et commission de simulation configurable via `BARAHUB_COMMISSION_RATE_BPS` (défaut 15 %) sont livrés. Les annulations client/prestataire/admin, le contrôle de créneau futur, le verrouillage transactionnel par prestataire et la file admin des demandes sont ajoutés. Les remboursements métier complets, modification de créneau et scénarios persistés multi-comptes restent à compléter.

## [~] Confiance, notifications et support
- Associer un avis à une prestation réellement terminée ; permettre signalement et réclamation.
- Ajouter notifications in-app et bouton WhatsApp support avec une référence de demande non sensible. Les notifications in-app persistantes sont livrées pour les nouvelles missions compatibles, acceptations, transitions de mission, nouveaux avis et confirmation de publication; elles sont dédupliquées et rafraîchies toutes les 15 secondes dans les espaces client et prestataire.
- Ne pas simuler l’envoi de messages réels ; e-mails, push natif et WhatsApp Business restent « en attente de configuration » sans secrets dans le client.
- Afficher les conditions de service et le support initial du pilote.

## [~] Messagerie client-prestataire
- Permettre au client propriétaire et au prestataire affecté de lire et d’envoyer des messages privés liés à la demande, uniquement après affectation et pendant les statuts autorisés; aucune adresse, coordonnée ou identité sensible ne doit être exposée par défaut.
- Valider côté serveur le participant réel depuis la commande, limiter un message à 2 000 caractères, dédupliquer les retries par clé d’idempotence et marquer lus uniquement les messages reçus par l’utilisateur courant.
- Afficher la conversation dans les espaces client et prestataire avec états vide, chargement, erreur et envoi; rafraîchir toutes les 5 secondes au premier plan et arrêter le polling en arrière-plan.
- Créer une notification in-app dédupliquée pour le destinataire d’un nouveau message; ne pas simuler WhatsApp, SMS, e-mail ou push tant que ces fournisseurs ne sont pas configurés.

**Évidence actuelle :** table `messages`, procédures protégées list/send/markRead, notification `message`, composant de conversation dans les deux espaces et tests d’accès anonyme livrés; WebSocket, push, pièces jointes et tests persistés à deux comptes restent ouverts.

## [~] Performance et PWA
- Optimiser pour Android d’entrée de gamme et connexions 3G/4G : interface légère, médias compressés/lazy-load, pagination, requêtes indexées, états de reprise et prévention des doubles soumissions.
- Conserver localement uniquement les formulaires non sensibles si approprié ; ne jamais modifier hors ligne une commande ou un paiement sans synchronisation/validation.
- Rendre la PWA installable avec manifeste correct ; cache public contrôlé du catalogue uniquement, jamais des données privées, commandes, documents ou pages admin.

**Évidence actuelle :** manifest français standalone, métadonnées Web, manifeste de routes Webdev, service worker limité aux assets publics et cache mémoire React Query sont livrés. `pnpm perf` mesure l’export JS à 3,13 MB, le CSS à 14,9 KB, le manifest à 875 octets, et un P95 local sous 1 s pour les ressources et requêtes testées. Les mesures sur appareils Android/3G réels, la pagination si le catalogue grossit et la réduction éventuelle du coût des polices d’icônes restent ouvertes.

## [~] Tests et préparation du pilote
- Exécuter les commandes réellement présentes : `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm db:push` et les tests métier ajoutés.
- Couvrir accès croisés, vérification/suspension, devis immuable, paiement d’autrui, double soumission, commission unique, avis après prestation, élévation admin, géolocalisation facultative, partage prestataire limité à une mission active, confidentialité des coordonnées, erreurs réseau, responsive mobile, montants FCFA, migrations et parcours complet. Les tests d’autorisation admin couvrent la lecture et la mutation par un utilisateur régulier; les tests notifications couvrent la protection sans session; les scénarios persistés d’émission et de marquage lu restent à compléter.
- Ajouter seed fictif, guide de recrutement/vérification, procédures commandes/réclamations, documentation déploiement/sauvegarde et checklist de lancement contrôlé.

**Évidence actuelle :** `pnpm check`, `pnpm lint`, `pnpm build` et `pnpm test` passent sur la recette MariaDB 11.4.5. Avec `BARAHUB_TEST_DATABASE_URL` : 76 réussis, 0 ignoré ; sans base de test : 67 réussis, 9 ignorés. Les 13 migrations, dont `drizzle/0012_natural_shadow_king.sql`, sont appliquées et le seed est chargé. La reprise sur base vide isolée recrée 13 migrations, 21 tables applicatives et la table de migrations. `tests/pilot.multi-account.integration.test.ts` couvre vérification, affectation, réclamation croisée et remboursement unique ; `tests/pilot.checklist.integration.test.ts` couvre catalogue, diagnostic obligatoire, gardes d’affectation, prestataire suspendu, double réclamation et rejet de remboursement ; `tests/auth.logout.test.ts` est réactivé et vert. Les procédures et le bilan sont décrits dans `docs/admin-operations.md`, `docs/pilot-preparation.md`, `docs/pilot-ui-mobile-checklist.md`, `docs/backup-restore-runbook.md` et `docs/pilot-validation-report.md`. Les 58 contrôles UI/mobile sont documentés mais initialement `BLOCKED` faute d’exécution navigateur/appareil avec OAuth de recette ; la sauvegarde/restauration locale est vérifiée, pas encore sur l’hébergement réel. Verdict actuel : recette technique validée, pilote production non validé.
- Ne pas déployer en production, supprimer des données ou faire une opération irréversible sans autorisation.
