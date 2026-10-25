# Plan d’implémentation — Barahub

## Situation de départ

Le projet Webdev `Barahub — Services à domicile à Abidjan` a été initialisé le 17 octobre 2026 avec le starter mobile géré Expo Router / React Native / TypeScript / NativeWind, serveur Express/tRPC et Drizzle sur base MySQL gérée. Aucun dépôt Barahub antérieur n’était monté dans le Sandbox : le starter généré est donc la baseline à préserver, et non une application métier existante à remplacer.

La commande `pnpm db:push` a été exécutée avec succès : le schéma initial `users` est synchronisé, sans migration en attente. Les diagnostics TypeScript Webdev sont enregistrés (`typescript`, gestion Sandbox). Les ports fixes du starter sont Metro/Web `8081` et API `3000`.

## Périmètre de livraison

Le premier livrable est un MVP mobile-first utilisable pour le pilote d’Abidjan : découverte du catalogue, demande de prestation, suivi d’une commande, espaces professionnel et administration protégés, et modèles métier persistants. Les paiements réels, WhatsApp Business, e-mails transactionnels et cartographie routière externe restent explicitement en attente de configuration ; le MVP ne simulera pas leur succès. Le GPS facultatif et le suivi borné d’une mission active sont déjà inclus.

Les fonctionnalités seront livrées par lots cohérents dans l’ordre du cahier des charges : fondations et rôles, pages publiques et design system, données et workflows, client, professionnel, administration, confiance/notifications/paiements déclaratifs, PWA/performance, tests et préparation du pilote.

## Architecture et structure

- `app/` : routes Expo Router. Les écrans publics et les onglets client seront légers, lisibles sur 320 px et réutiliseront les composants de `components/`.
- `components/` : primitives visuelles Barahub, cartes de catégories, cartes de prestations, badges de statut, champs de formulaire et états chargement/erreur/vide.
- `features/` : modules métier isolés (catalogue, demandes, devis, profil professionnel, administration) quand une logique dépasse un écran.
- `server/` : procédures tRPC et contrôles serveur. Les règles d’accès, transitions, calculs FCFA et idempotence restent côté serveur.
- `drizzle/` : schéma MySQL, relations et migrations additives. Les données partagées développement/publication seront traitées comme durables ; aucune migration destructive sans autorisation.
- `lib/` et `hooks/` : client tRPC, session Manus OAuth, helpers d’affichage et stockage local prudent des brouillons non sensibles.
- `assets/images/` : icônes natives et favicon Barahub, sans secrets ni données privées.
- `docs/` : audit de phase, règles opérationnelles, sécurité, déploiement et préparation pilote.

## Design system retenu

### Options explorées

- **Atelier ivoirien contemporain** — chaleur locale, précision utilitaire et surfaces claires (0,07).
- **Service bleu signal** — interface très fonctionnelle, contrastée et orientée confiance (0,05).
- **Calme domestique** — tons doux et rythme éditorial rassurant (0,08).

### Choix : Atelier ivoirien contemporain

- **Mouvement** : design de service mobile inspiré des interfaces d’atelier et de signalétique urbaine d’Abidjan, sans folklore décoratif.
- **Principes** : proximité, lisibilité instantanée, confiance sans promesse exagérée, actions courtes à une main.
- **Couleurs** : vert lagune profond pour l’action fiable, ivoire chaud pour le fond, corail-orangé pour les alertes et accents ; les statuts restent codés par texte et contraste, jamais par couleur seule.
- **Mise en page** : colonne mobile respirante, hero compact avec recherche prioritaire, sections en cartes empilées et barre d’action persistante seulement lorsqu’elle apporte une action réelle.
- **Signatures** : pastilles de zone « Abidjan », pictogrammes simples de métier, accent corail sur les demandes urgentes ; aucun faux compteur ni preuve sociale inventée.
- **Interactions** : une action principale par écran, états de transmission explicites, confirmations contrôlées pour annulations et changements sensibles.
- **Animation** : transitions courtes et discrètes, respect de `prefers-reduced-motion`, aucun effet qui retarde la réservation ou consomme inutilement le réseau.
- **Typographie** : sans-serif système/Inter-like pour une lecture rapide, titres semi-bold compacts, textes d’aide 14–16 px et boutons d’au moins 44 px de hauteur.
- **Essence** : « Le bon professionnel pour votre maison, simplement. » Personnalité : proche, fiable, concrète.
- **Voix** : titres directs (« Un service fiable, près de chez vous »), CTA explicites (« Décrire mon besoin ») ; éviter les promesses de certification ou de disponibilité non vérifiée.
- **Marque** : wordmark `Barahub` accompagné d’un monogramme “B” formé de deux trajets convergents ; l’icône carrée native ne comporte pas de coins arrondis intégrés.
- **Couleur signature** : vert lagune `#0D6B5B`, utilisé avec parcimonie pour l’action principale et les repères de confiance.

## Choix techniques et sécurité

- Conserver Expo Router, React Native Web, NativeWind, Express/tRPC, Drizzle et la table d’authentification existante.
- Utiliser Manus OAuth par défaut ; conserver la session `webdev_app_session` et les contrôles de JWT du starter. Le rôle est résolu côté serveur depuis la base, jamais depuis un champ fourni par le client.
- Étendre le schéma avec des tables métier et contraintes explicites : catégories, prestations, zones, profils prestataires, disponibilités, demandes, affectations, devis, historique de statuts, paiements déclaratifs, commissions, avis, réclamations, notifications et journal d’audit.
- Centraliser les transitions autorisées dans le serveur et enregistrer chaque changement. Ajouter des clés d’idempotence pour les demandes, acceptations de devis et commissions. Les rendez-vous confirmés sont conservés dans `appointments`; la planification verrouille la ligne du prestataire dans une transaction, vérifie les intervalles qui se chevauchent et libère le rendez-vous à l’annulation.
- Ne pas introduire de secrets dans le bundle Expo. Les adresses injectées par Webdev restent dynamiques ; ne pas les hardcoder.
- Les adresses précises et documents privés ne seront rendus qu’aux acteurs autorisés, au moment nécessaire. Les tests utilisent des fixtures fictives.
- Mettre en place le manifeste PWA détenu par l’application dans `public/manifest.webmanifest` et `app/+html.tsx`, avec un service worker minimal (`public/sw.js`) qui précache uniquement les ressources publiques statiques et exclut `/api/`, les commandes, documents, espaces client/prestataire et administration. La configuration PWA du projet mobile ne reconnaît pas le champ `application_owned`; l’application garde donc explicitement son lien manifest sans dépendre de cette écriture de configuration.
- Ajouter `public/manus-routes.json` pour déclarer les routes Expo Web, une commande `pnpm perf` et un rapport de mesure avec budgets séparés bundle/ressources/API. Ne pas persister hors ligne les mutations ou données privées.

## Workflow de build et validation

1. Baseline : audit du starter, `pnpm db:push`, diagnostics TypeScript et état des services.
2. Fondations : thème Barahub, navigation, rôles serveur, schéma additif, données fictives non personnelles et erreurs structurées.
3. Implémentation par lot : modifier uniquement les fichiers concernés, garder les changements lisibles et vérifier les diagnostics après chaque lot.
4. Contrôles : `pnpm check`, `pnpm lint`, `pnpm test`, migration et tests d’autorisations/workflows ; distinguer les problèmes préexistants des régressions.
5. Vérification runtime : API sur `3000`, Preview/Metro sur `8081`, écran de démarrage et parcours principaux en web mobile ; les capacités natives non testées sur Web seront signalées.
6. Checkpoint Manus uniquement après un lot testé et sans publication automatique. Aucun déploiement de production n’est autorisé par défaut.

## Limites explicites

La commission de 15 % est une valeur de simulation configurable, pas une décision commerciale. Les paiements Mobile Money, l’envoi WhatsApp réel, les e-mails et les sauvegardes externes restent en attente de configuration. La disponibilité réelle des zones, catégories et prestataires devra être validée par l’administration avant un pilote commercial.

Le système d’avis utilise une table unique par demande, valide côté serveur la propriété client et le statut `COMPLETED`, puis journalise la transition `COMPLETED → REVIEWED`; la synthèse prestataire ne compte que les avis publiés.

L’administration des avis est exposée sur `/admin` avec `adminProcedure`, signalements uniques par utilisateur, statuts `open/resolved/dismissed` et journal `adminAuditLogs`; le rôle client est uniquement un indice d’affichage et la décision serveur reste autoritaire.

Le temps réel du pilote utilise une file `notifications` persistée, idempotente et protégée par utilisateur, avec polling in-app de 15 secondes dans les espaces client et prestataire; push natif, email et WhatsApp restent derrière des intégrations explicitement configurées.

La géolocalisation du pilote est facultative et au premier plan: `expo-location` collecte la position client sur consentement, `providerLocations` conserve une dernière position par mission, et les lectures client sont limitées à son propre rendez-vous actif. La carte MVP est schématique afin de ne pas exposer de clé Maps; le proxy Maps reste l’option future pour routes et fond cartographique.

La messagerie du pilote est liée à `serviceRequests`: `messages` conserve le contenu, les participants dérivés, la lecture et l’idempotence; le serveur autorise uniquement le client propriétaire et le prestataire affecté. Le client et le prestataire utilisent `ConversationCard` avec polling de 5 secondes au premier plan; une notification in-app informe le destinataire sans simuler de push ou de canal externe.

Les rapports administrateur restent en lecture seule et sont calculés à la demande par `admin.analytics` côté serveur sur une fenêtre de 7, 30 ou 90 jours. Les agrégats couvrent l’activité opérationnelle, les statuts, les utilisateurs, la vérification prestataire, les avis, les signalements, les services et les zones; aucun revenu n’est extrapolé avant la livraison du modèle de paiement.

Le lot devis-paiements ajoute des devis persistants avec statut et idempotence, l’acceptation ou le refus par le client, puis une déclaration de paiement sans débit. La confirmation, l’échec et le remboursement sont des actions admin journalisées; les montants sont calculés côté serveur en FCFA et la commission de simulation est configurable par `BARAHUB_COMMISSION_RATE_BPS`, avec une valeur initiale de 15 %. Aucune donnée bancaire, PIN ou carte n’est stockée et une intégration Mobile Money/externe réelle reste à configurer.

Le lot annulation-disponibilité autorise les annulations selon l’acteur et le statut, inscrit `CANCELLED` dans l’historique, supprime le rendez-vous confirmé associé et notifie les parties. Un rendez-vous doit avoir un créneau futur; sa durée vient du service ou vaut 60 minutes par défaut. Le verrouillage d’une ligne `providerProfiles` séquence les réservations concurrentes d’un même prestataire avant le contrôle `startsAt < autreFin` et `endsAt > autreDébut`; les créneaux simplement adjacents restent valides.
