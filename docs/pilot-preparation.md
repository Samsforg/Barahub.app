# Préparation du pilote Barahub

## Périmètre livré

- Administration : vérification/suspension prestataire, affectation manuelle, catalogue (catégories, prestations, zones), réclamations, remboursements, avis/signalements, paiements, analyse.
- Client : réclamation liée à une demande, suivi du statut, notifications in-app.
- Prestataire : missions, devis, statuts, position partagée, messagerie.
- Hors périmètre volontaire : Mobile Money réel, WhatsApp Business, e-mail transactionnel, push natif, service cartographique payant, pièces jointes de vérification.

## Prérequis

- Node.js compatible avec Expo 57.
- MySQL accessible et `DATABASE_URL` valide.
- `BARAHUB_SESSION_SECRET` configuré côté serveur.
- `pnpm` 9.12 (ou `npx --yes pnpm@9.12.0`).
- Pour les tests persistés : une base **dédiée** exposée par `BARAHUB_TEST_DATABASE_URL`.

## Installation et vérifications

```bash
npx --yes pnpm@9.12.0 install --frozen-lockfile
npx --yes pnpm@9.12.0 check
npx --yes pnpm@9.12.0 lint
npx --yes pnpm@9.12.0 test
```

Résultat attendu au dernier passage : `check` sans erreur, `lint` sans erreur. Sans base de test : 67 réussis et 9 ignorés (scénarios persistés). Avec `BARAHUB_TEST_DATABASE_URL` : 76 réussis et 0 ignoré.

## Migration et seed

```bash
# Générer la migration si le schéma change
npx --yes pnpm@9.12.0 exec drizzle-kit generate

# Appliquer sur la base ciblée (action réelle)
npx --yes pnpm@9.12.0 db:push

# Charger le catalogue fictif
npx --yes pnpm@9.12.0 db:seed
```

La migration du lot administration est `drizzle/0012_natural_shadow_king.sql` : deux tables (`complaints`, `refunds`) et trois colonnes de vérification sur `providerProfiles`. Elle est additive. Ne pas exécuter `db:push` sur une base de production sans sauvegarde et autorisation.

## Tests persistés multi-comptes

```powershell
$env:BARAHUB_TEST_DATABASE_URL="mysql://user:<mot-de-passe>@host:3306/barahub_test"
npx --yes pnpm@9.12.0 test
```

Sans cette variable, les 9 scénarios persistés sont ignorés. Les fichiers `tests/pilot.multi-account.integration.test.ts` et `tests/pilot.checklist.integration.test.ts` créent puis suppriment leurs propres fixtures :

1. vérification d’un prestataire puis affectation manuelle d’une demande ;
2. ouverture d’une réclamation par le client propriétaire ;
3. refus d’accès à la réclamation par un autre client ;
4. clôture de la réclamation avec restauration du statut `COMPLETED` ;
5. remboursement unique d’un paiement confirmé jusqu’à `REFUNDED`, puis refus d’un second traitement ;
6. création de catalogue et refus d’un prix fixe quand le diagnostic est obligatoire ;
7. affectation limitée aux prestataires vérifiés couvrant la prestation et la zone ;
8. refus d’une mission par un prestataire suspendu ;
9. refus d’une deuxième réclamation active et restauration du statut lors du rejet d’un remboursement.

Utiliser une base vide dédiée : les tests écrivent des utilisateurs, catégories, zones, demandes, paiements, notifications et journaux, puis les nettoient. Ne jamais pointer sur la base de production.

### Passage recette du 22 octobre 2026

- MariaDB 11.4.5 portable, instance isolée sur le port 3307, base `barahub_recette`.
- 13 migrations appliquées, dont `0012_natural_shadow_king.sql` ; seed chargé (5 catégories, 3 prestations, 5 zones).
- `check`, `lint`, `build` verts ; `test` : 76 réussis, 0 ignoré avec `BARAHUB_TEST_DATABASE_URL`.
- Contrôle après tests : aucun utilisateur, demande, réclamation, remboursement ou journal de test résiduel.
- Reprise complète des 13 migrations sur une base vide isolée : 13 lignes de migration, 21 tables applicatives et la table `__drizzle_migrations`.
- Sauvegarde et restauration testées sur une base isolée : 13 migrations, 22 tables, 5 catégories, 3 prestations, 5 zones, 40 contraintes de clés étrangères, `mariadb-check` vert.

## Checklist fonctionnelle manuelle

La checklist détaillée, avec identifiants de contrôle, étapes, preuves et statuts `PASS`/`FAIL`/`BLOCKED`, se trouve dans `docs/pilot-ui-mobile-checklist.md`. Tous ses contrôles sont initialement `BLOCKED` tant qu’ils n’ont pas été exécutés sur un navigateur ou un appareil réel avec les comptes de recette. Le bilan consolidé est dans `docs/pilot-validation-report.md`.

### Comptes

- [ ] Un client A crée une demande.
- [ ] Un client B ne voit ni la demande ni la réclamation de A.
- [ ] Un prestataire non vérifié n’apparaît pas dans les affectations.
- [ ] Un prestataire suspendu ne peut plus accepter de mission.
- [ ] Un utilisateur `user` ne peut pas ouvrir `/admin` ni appeler une procédure admin.

### Administration

- [ ] Vérifier un prestataire compatible avec la prestation et la zone.
- [ ] Affecter la demande : statut `ASSIGNED`, client et prestataire notifiés.
- [ ] Tenter d’affecter un prestataire hors zone : refus explicite.
- [ ] Créer/modifier/désactiver une catégorie, une prestation et une zone.
- [ ] Vérifier qu’un diagnostic obligatoire interdit le prix fixe.
- [ ] Traiter un signalement d’avis.

### Réclamation

- [ ] Le client ouvre une réclamation : demande en `CLAIM_OPEN`.
- [ ] Une deuxième réclamation active est refusée.
- [ ] L’admin prend en charge puis résout : statut précédent restauré.
- [ ] Le client voit la note de suivi et reçoit une notification.

### Remboursement

- [ ] Confirmer un paiement déclaré.
- [ ] Créer un remboursement : demande en `REFUND_PENDING`.
- [ ] Confirmer : paiement `refunded`, demande `REFUNDED`.
- [ ] Rejouer la décision : refus.
- [ ] Rejeter un autre remboursement : statut précédent restauré.

### Mobile et réseau

- [ ] Tester à 320 px de largeur, sans débordement horizontal.
- [ ] Vérifier les états chargement, erreur, vide et reprise sur chaque onglet admin.
- [ ] Couper le réseau pendant une action : message d’erreur, pas de faux succès.
- [ ] Vérifier les montants en FCFA et l’absence de décimales affichées.

## Sauvegarde, restauration et déploiement

La procédure détaillée et son test local sont décrits dans `docs/backup-restore-runbook.md`.

- Sauvegarder la base avant migration : dump MySQL complet et vérification de restauration sur une base de test.
- Conserver les variables d’environnement hors du dépôt ; ne jamais committer `DATABASE_URL`, secrets de session ou clés fournisseur.
- Déployer d’abord sur un environnement de recette, rejouer la checklist, puis seulement envisager la production.
- Prévoir un retour arrière : snapshot/base de secours et conservation des anciennes migrations. Les nouvelles tables ne bloquent pas les parcours existants, mais les nouvelles colonnes de `providerProfiles` sont requises par le code admin.

## Critères de lancement

- `check`, `lint`, `test` verts.
- Migration appliquée et seed chargé sur la base de recette.
- Tests persistés exécutés avec `BARAHUB_TEST_DATABASE_URL`.
- Checklist ci-dessus validée par au moins deux comptes réels et un administrateur.
- Sauvegarde récente et procédure de restauration testée.
- Aucun secret dans le client ni dans le dépôt.
