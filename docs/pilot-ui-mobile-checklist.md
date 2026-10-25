# Checklist de validation UI et mobile — pilote Barahub

## Statut du document

- **Statut global : NON EXÉCUTÉ — BLOCKED.**
- Aucun contrôle manuel de ce document n’a été exécuté pendant l’audit du 22 octobre 2026.
- Un contrôle ne peut passer à `PASS` qu’après exécution réelle, avec preuve et identité du testeur.
- Les tests automatisés déjà verts sont listés dans `docs/pilot-validation-report.md` ; ils ne remplacent pas cette checklist.

## Règles d’exécution

1. Utiliser uniquement la base de recette et des comptes fictifs dédiés.
2. Ne jamais utiliser de compte, d’adresse ou de donnée personnelle réelle.
3. Ne pas modifier le rôle d’un compte depuis le client. L’octroi du rôle `admin` est une opération serveur autorisée et journalisée.
4. Ne pas supprimer, réinitialiser ou restaurer la base de recette sans autorisation.
5. Ne pas tester sur la production, ne pas déployer et ne pas publier.
6. En cas d’absence de navigateur, d’appareil ou de fournisseur OAuth de recette, conserver `BLOCKED` et ne pas déclarer le parcours validé.
7. Consigner chaque anomalie avec une capture, l’heure, le compte utilisé et les étapes exactes.

## Statuts autorisés

| Statut | Signification |
| --- | --- |
| `PASS` | Contrôle exécuté, résultat conforme, preuve disponible. |
| `FAIL` | Contrôle exécuté, résultat non conforme, anomalie créée. |
| `BLOCKED` | Contrôle non exécutable : environnement, compte, appareil, OAuth ou autorisation manquant. |
| `N/A` | Contrôle hors périmètre, avec justification. |

## Environnement à renseigner avant exécution

| Élément | Valeur |
| --- | --- |
| Date et heure | |
| Testeur | |
| Build ou version | |
| Commit Git | Non disponible : le dossier n’est pas un dépôt Git. |
| API | |
| Navigateur ou appareil | |
| Système et version | |
| Largeur d’écran | 320 px, 360 px, 390 px ou appareil réel |
| Réseau | Wi-Fi, 4G, 3G simulée, hors ligne |
| Base | `barahub_recette` sur MariaDB 11.4.5, port 3307 |
| Fournisseur OAuth | |
| Compte client A | Alias uniquement |
| Compte client B | Alias uniquement |
| Compte prestataire A | Alias uniquement |
| Compte prestataire B | Alias uniquement |
| Compte admin | Alias uniquement |

## Prérequis

- [ ] `pnpm check`, `pnpm lint`, `pnpm build` et `pnpm test` verts sur la recette.
- [ ] 13 migrations appliquées et seed chargé : 5 catégories, 3 prestations, 5 zones.
- [ ] Aucun utilisateur, demande, réclamation, remboursement ou journal de test résiduel.
- [ ] Serveur applicatif démarré sur la recette.
- [ ] Client web ou application démarré sur un appareil de test.
- [ ] Cinq comptes fictifs disponibles : client A, client B, prestataire A, prestataire B, admin.
- [ ] Prestataire A vérifié et compatible avec une prestation et une zone de recette.
- [ ] Prestataire B non vérifié, ou vérifié mais hors zone, pour les contrôles de refus.
- [ ] Un paiement confirmé et une demande `COMPLETED` disponibles pour les scénarios de remboursement et d’avis.
- [ ] Un créneau futur disponible pour la planification.
- [ ] Un outil de capture d’écran et un dossier de preuves prêts.

## A — Authentification et cloisonnement des accès

| ID | Contrôle et étapes | Attendu | Statut | Preuve |
| --- | --- | --- | --- | --- |
| A01 | Ouvrir `/` sans session. Parcourir le catalogue, rechercher un service et changer de catégorie. | Le catalogue public s’affiche ; aucune demande, notification ou donnée privée n’apparaît. | `BLOCKED` | — |
| A02 | Ouvrir `/requests` sans session. | Message de connexion, aucune donnée privée, bouton de connexion fonctionnel. | `BLOCKED` | — |
| A03 | Se connecter avec client A, créer une demande, puis se connecter avec client B et ouvrir `/requests`. | B ne voit ni la demande ni la réclamation de A. | `BLOCKED` | — |
| A04 | Avec client A, ouvrir `/admin` directement par URL. | Accès refusé côté interface et côté serveur ; aucun onglet admin chargé. | `BLOCKED` | — |
| A05 | Se connecter avec le compte admin et ouvrir `/admin`. | Les neuf onglets sont accessibles : Avis, Signalements, Prestataires, Demandes, Catalogue, Réclamations, Remboursements, Paiements, Analyse. | `BLOCKED` | — |
| A06 | Depuis un compte non admin, tenter une mutation admin protégée avec un outil API ou un test automatisé. | Réponse `FORBIDDEN` ; aucune écriture en base. | `BLOCKED` | — |
| A07 | Fermer la session, puis rouvrir une route privée avec le bouton Retour du navigateur. | La session fermée ne donne plus accès aux données privées. | `BLOCKED` | — |

## B — Parcours client

| ID | Contrôle et étapes | Attendu | Statut | Preuve |
| --- | --- | --- | --- | --- |
| B01 | Accueil : rechercher `plomberie`, sélectionner une catégorie, puis saisir un terme sans résultat. | Filtres corrects, compteur cohérent, état vide explicite, bouton d’effacement fonctionnel. | `BLOCKED` | — |
| B02 | Ouvrir `/request` avec les champs vides, puis saisir une description et une zone valides. | Le bouton reste désactivé tant que description et zone sont vides ; il s’active ensuite. | `BLOCKED` | — |
| B03 | Saisir un créneau mal formé, puis un créneau passé, puis un créneau futur valide. | Deux messages d’erreur distincts ; le créneau futur est accepté ; aucun envoi silencieux. | `BLOCKED` | — |
| B04 | Refuser l’autorisation GPS, puis envoyer la demande. | Message non bloquant indiquant que la position est facultative ; la demande peut être envoyée. | `BLOCKED` | — |
| B05 | Double-taper sur Envoyer et répéter avec une connexion lente. | Une seule demande créée ; état `Envoi...` ; aucun doublon, aucun faux succès. | `BLOCKED` | — |
| B06 | Retrouver la demande dans `/requests`, puis l’annuler avant démarrage. | Confirmation affichée ; statut `CANCELLED` ; bouton d’annulation disparaît ; notification cohérente. | `BLOCKED` | — |
| B07 | Recevoir un devis, l’accepter, puis déclarer un paiement en espèces ou Mobile Money. | Montants FCFA corrects ; acceptation unique ; aucun débit réel ; mention explicite de confirmation manuelle. | `BLOCKED` | — |
| B08 | Refuser un devis, puis vérifier l’état de la demande et les boutons. | Statut et texte cohérents ; aucune acceptation possible après refus ; pas de double action. | `BLOCKED` | — |
| B09 | Ouvrir une réclamation avec un sujet trop court, puis une description trop courte, puis des valeurs valides. | Bouton bloqué pour les valeurs invalides ; message clair ; réclamation créée et demande passée à `CLAIM_OPEN`. | `BLOCKED` | — |
| B10 | Tenter une deuxième réclamation active sur la même demande. | Refus explicite ; aucune deuxième réclamation ; statut inchangé. | `BLOCKED` | — |
| B11 | Faire prendre en charge puis résoudre la réclamation par l’admin ; revenir côté client. | Note de suivi visible ; statut précédent restauré ; notification reçue ; aucun accès aux réclamations d’un autre client. | `BLOCKED` | — |
| B12 | Sur une demande `COMPLETED`, noter sans étoile, puis avec 1 étoile et un commentaire. | Envoi bloqué sans note ; avis créé une seule fois ; demande passée à `REVIEWED` ; avis non modifiable ensuite. | `BLOCKED` | — |
| B13 | Ouvrir les notifications, marquer une notification lue, puis tout marquer lu. | Compteur décrémenté, état lu persistant après rechargement, aucune notification d’un autre compte. | `BLOCKED` | — |
| B14 | Envoyer un message dans la conversation liée à une mission affectée. | Message visible des deux participants autorisés uniquement ; état d’envoi et erreur réseau corrects. | `BLOCKED` | — |

## C — Parcours prestataire

| ID | Contrôle et étapes | Attendu | Statut | Preuve |
| --- | --- | --- | --- | --- |
| C01 | Ouvrir `/provider` sans session. | Message de connexion ; aucune mission ni donnée privée. | `BLOCKED` | — |
| C02 | Créer un profil avec un nom, sans prestation ni zone. | Enregistrement désactivé ; message ou état explicite ; aucune création partielle. | `BLOCKED` | — |
| C03 | Créer un profil complet avec prestations et zones, puis recharger. | Profil `pending` ; aucune mission disponible ; aucune affectation possible. | `BLOCKED` | — |
| C04 | Vérifier le profil depuis `/admin`, puis rouvrir `/provider`. | Statut `verified` ; notification reçue ; seules les missions compatibles avec prestation et zone apparaissent. | `BLOCKED` | — |
| C05 | Accepter une mission disponible, puis tenter de l’accepter à nouveau. | Une seule acceptation ; statut `ACCEPTED` ; aucun doublon d’historique ou de notification. | `BLOCKED` | — |
| C06 | Refuser une mission disponible. | Statut et liste mis à jour ; aucune mission acceptée par erreur ; client non exposé à une adresse précise. | `BLOCKED` | — |
| C07 | Envoyer un devis avec un montant vide, zéro, négatif, décimal ou non numérique. | Envoi bloqué ; message clair ; aucun devis créé. | `BLOCKED` | — |
| C08 | Envoyer un devis valide avec frais de déplacement à zéro, puis un autre avec frais positifs. | Montants entiers positifs ; total correct ; devis visible côté client ; pas de doublon. | `BLOCKED` | — |
| C09 | Enchaîner `ACCEPTED → SCHEDULED → IN_PROGRESS → COMPLETED` avec un créneau futur. | Chaque transition est autorisée une seule fois ; créneau futur obligatoire ; aucun retour arrière silencieux. | `BLOCKED` | — |
| C10 | Partager la position en `SCHEDULED`, puis en `IN_PROGRESS`, puis arrêter le partage. | Partage possible uniquement sur mission active ; arrêt effectif ; le client ne voit que sa propre mission. | `BLOCKED` | — |
| C11 | Annuler une mission avant démarrage, puis tenter après démarrage. | Confirmation avant annulation ; annulation autorisée avant démarrage ; refus explicite après démarrage. | `BLOCKED` | — |
| C12 | Suspendre le prestataire depuis `/admin` pendant qu’il a une mission, puis revenir côté prestataire. | Nouvelles missions et acceptations refusées ; historique conservé ; message de suspension visible. | `BLOCKED` | — |
| C13 | Consulter la synthèse des avis et signaler un avis. | Moyenne et nombre corrects ; avis masqués exclus ; signalement créé une seule fois. | `BLOCKED` | — |

## D — Administration

| ID | Contrôle et étapes | Attendu | Statut | Preuve |
| --- | --- | --- | --- | --- |
| D01 | Ouvrir chaque onglet admin et faire défiler horizontalement la barre d’onglets. | Tous les onglets sont atteignables ; aucun contenu tronqué ; état de chargement puis contenu. | `BLOCKED` | — |
| D02 | Vérifier un prestataire, le suspendre, puis le remettre en attente. | Statuts corrects ; notifications ; lignes d’audit `provider.*` ; aucun historique supprimé. | `BLOCKED` | — |
| D03 | Ouvrir une demande `REQUESTED` et vérifier les candidats à l’affectation. | Seuls les prestataires vérifiés, compatibles prestation et zone active, apparaissent. | `BLOCKED` | — |
| D04 | Affecter un candidat, puis tenter une seconde affectation sur la même demande. | Statut `ASSIGNED` ; historique et notifications ; seconde affectation refusée. | `BLOCKED` | — |
| D05 | Créer, modifier et désactiver une catégorie, une prestation et une zone. | Opérations persistées ; slugs normalisés ; catalogue public mis à jour ; audit écrit. | `BLOCKED` | — |
| D06 | Créer une prestation à prix fixe avec diagnostic obligatoire, puis l’inverse. | Prix fixe avec diagnostic obligatoire refusé ; prix fixe sans diagnostic accepté ; message explicite. | `BLOCKED` | — |
| D07 | Créer une zone déjà existante, puis modifier son statut actif. | Doublon refusé ; activation/désactivation persistée ; aucune affectation sur zone inactive. | `BLOCKED` | — |
| D08 | Prendre en charge une réclamation, la résoudre, puis traiter une autre en rejet. | Statuts `in_progress`, `resolved`, `dismissed` ; statut précédent restauré à la clôture ; note visible côté client. | `BLOCKED` | — |
| D09 | Confirmer un paiement déclaré, puis marquer un autre paiement échoué. | Statuts `confirmed` et `failed` uniquement ; aucun bouton de remboursement direct ; audit et notification. | `BLOCKED` | — |
| D10 | Créer un remboursement sur un paiement confirmé, puis le confirmer. | Demande `REFUND_PENDING`, remboursement `completed`, paiement `refunded`, demande `REFUNDED`. | `BLOCKED` | — |
| D11 | Créer un second remboursement sur le même paiement, puis rejeter un autre remboursement en attente. | Second remboursement refusé ; rejet restaure le statut précédent ; aucune double écriture. | `BLOCKED` | — |
| D12 | Masquer, rétablir et signaler un avis ; traiter puis rejeter un signalement. | Statuts et libellés cohérents ; aucun avis supprimé ; audit et état persistant. | `BLOCKED` | — |
| D13 | Ouvrir Analyse en 7, 30 et 90 jours, avec données puis sans données. | Agrégats cohérents ; période appliquée ; états vide et erreur ; aucun revenu ou paiement fictif affiché. | `BLOCKED` | — |
| D14 | Vérifier qu’aucune adresse précise, coordonnée GPS ou donnée d’un autre client n’apparaît dans les files admin. | Seules les informations nécessaires au traitement sont affichées. | `BLOCKED` | — |

## E — Mobile, réseau et accessibilité

| ID | Contrôle et étapes | Attendu | Statut | Preuve |
| --- | --- | --- | --- | --- |
| E01 | Tester `/`, `/request`, `/requests`, `/provider`, `/admin` et `/support` à 320 px de large. | Aucun débordement horizontal ; textes et boutons lisibles ; scroll vertical fonctionnel. | `BLOCKED` | — |
| E02 | Vérifier les zones tactiles des actions principales et destructives. | Cibles d’au moins 44 × 44 px ; espacement suffisant ; pas de double action accidentelle. | `BLOCKED` | — |
| E03 | Vérifier les états chargement, vide et erreur de chaque panneau admin. | Chaque état est explicite ; bouton Réessayer fonctionnel ; aucun total inventé. | `BLOCKED` | — |
| E04 | Simuler une connexion lente et soumettre une demande, un devis, un paiement et une action admin. | Indicateur de progression ; bouton désactivé ; aucun faux succès ; reprise possible. | `BLOCKED` | — |
| E05 | Couper le réseau pendant un envoi, puis le rétablir. | Erreur explicite ; aucune donnée partielle ; nouvelle tentative sans doublon. | `BLOCKED` | — |
| E06 | Double-taper sur chaque action sensible : accepter, annuler, rembourser, vérifier, publier un avis. | Une seule opération ; état final cohérent ; aucun doublon en base. | `BLOCKED` | — |
| E07 | Vérifier les montants, dates et libellés en français. | FCFA sans décimales ; dates lisibles ; accents corrects ; textes longs qui reviennent à la ligne. | `BLOCKED` | — |
| E08 | Vérifier les zones sûres, le clavier, le retour arrière et la tabulation sur appareil réel. | Aucun champ masqué par le clavier ; navigation stable ; zone de tabulation respectée. | `BLOCKED` | — |
| E09 | Vérifier les libellés d’accessibilité des boutons icônes et des champs principaux. | Les actions sont annoncées lisiblement par le lecteur d’écran. | `BLOCKED` | — |
| E10 | Vérifier qu’aucune donnée privée n’est mise en cache ou visible après déconnexion. | Les données privées ne réapparaissent pas ; le cache public ne contient que le catalogue. | `BLOCKED` | — |

## Journal des anomalies

| ID | Sévérité | Écran | Étapes | Attendu | Observé | Preuve | Statut | Propriétaire |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | `BLOCKER`, `CRITICAL`, `MAJOR`, `MINOR` | | | | | | `OPEN`, `FIXED`, `VERIFIED` | |

## Preuves attendues

- Capture ou vidéo nommée `AAAAMMJJ-<ID>-<étape>-<appareil>.<ext>`.
- Heure de début et de fin.
- Alias du compte utilisé, jamais l’adresse réelle.
- Statut avant et après l’action.
- Pour une anomalie : message exact, étapes reproductibles et résultat en base si autorisé.
- Les preuves ne doivent contenir aucun mot de passe, jeton, adresse personnelle ou secret.

## Critères de sortie

- [ ] Tous les contrôles applicables sont `PASS` ou justifiés `N/A`.
- [ ] Aucun `BLOCKER` ou `CRITICAL` ouvert.
- [ ] Les anomalies `MAJOR` sont corrigées et rejouées.
- [ ] Les parcours client, prestataire et admin ont été exécutés avec des comptes distincts.
- [ ] Le comportement à 320 px et en réseau dégradé est validé.
- [ ] Les preuves sont archivées hors du dépôt.
- [ ] La sauvegarde/restauration est validée avant toute décision de production.
- [ ] Le rapport final est mis à jour et la décision de passage en production est prise explicitement.
