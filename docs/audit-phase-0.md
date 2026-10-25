# Barahub — Rapport d’audit Phase 0

## Phase terminée

Baseline technique établie le 17 octobre 2026. Aucun dépôt Barahub existant n’était accessible dans l’environnement initial ; l’initialisation Webdev a créé le projet mobile `barahub` dans `/home/ubuntu/barahub`. La source de vérité est donc le starter généré, sans fonctionnalité métier à préserver au-delà des adaptateurs Expo/Auth/API/Drizzle fournis.

## Architecture observée

- Expo Router / React Native / TypeScript / NativeWind.
- Express + tRPC côté serveur.
- Drizzle ORM sur MySQL compatible géré par Webdev.
- Ports fixes : Metro/Web `8081`, API `3000`.
- Authentification Manus OAuth préparée par le starter.
- Table métier actuelle : `users` avec rôle `user|admin`.
- Écran actuel : démonstration NativeWind “Welcome / NativeWind Ready”.
- Assets natifs de démarrage présents dans `assets/images/`.

## Git et changements

- Branche observée : `main`.
- Le dépôt généré était propre lors de l’audit (`git status --short --branch` ne signalait pas de modifications).
- Aucun travail utilisateur antérieur n’a été écrasé.

## Contrôles exécutés

- `pnpm db:push` : succès ; Drizzle a généré/validé la migration et indiqué « No schema changes, nothing to migrate ».
- Diagnostics Webdev : TypeScript enregistré et géré par le Sandbox.
- Le serveur de développement a été relancé ; la vérification HTTP des deux ports reste à effectuer après stabilisation.

## Risques critiques identifiés

1. Le starter ne contient encore aucun modèle métier Barahub : il faut ajouter les tables et règles par migrations additives.
2. Le rôle `admin` actuel existe mais doit être renforcé par une résolution serveur et un journal d’audit.
3. Aucun workflow de commande/devis, contrôle d’accès croisé, idempotence, paiement déclaratif ou notification métier n’existe encore.
4. Les assets d’icône sont ceux du starter : une identité Barahub distincte devra être appliquée avant le premier checkpoint applicatif.
5. Les intégrations externes (WhatsApp Business, e-mail, Mobile Money, stockage de photos) ne sont pas configurées ; elles ne doivent pas être simulées.
6. La base gérée est partagée entre développement et publication : toute migration ou fixture doit être additive, fictive et réversible autant que possible.

## Plan priorisé

1. Fondations : thème, navigation, auth/permissions serveur, schéma métier minimal, migrations et fixtures fictives.
2. Parcours public et client : catalogue, zones, demande, devis et suivi.
3. Parcours professionnel : profil, vérification, couverture, demandes et devis.
4. Administration : vérification, affectation manuelle, catalogue, commandes, commissions, audit.
5. Confiance/paiements déclaratifs/notifications et support.
6. PWA/performance, tests de risques métier, documentation pilote.

## Verdict

**PASS WITH LIMITATIONS** — la baseline et l’environnement sont identifiés, la base initiale est synchronisée et le projet est démarrable sous réserve de vérifier les deux listeners. Le produit Barahub n’est pas encore implémenté et ne doit pas être présenté comme opérationnel commercialement.
