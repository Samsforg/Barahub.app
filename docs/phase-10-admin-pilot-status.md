# Phase 10 — Administration complète et préparation du pilote

## Livré

### Vérification prestataire

- Colonnes `providerProfiles.verificationNote`, `verifiedBy`, `verifiedAt`.
- `admin.providers`, `admin.reviewProvider` (vérifier, suspendre, remettre en attente).
- Journal `provider.<statut>` et notification in-app au prestataire.
- Un profil non vérifié est exclu des affectations ; un profil suspendu ne reçoit plus de mission.

### Affectation manuelle

- `admin.assignableProviders` filtre les prestataires vérifiés qui couvrent la prestation et la zone active.
- `admin.assignRequest` verrouille la demande, refuse un statut différent de `REQUESTED`, refuse un prestataire non vérifié, hors zone ou sans la prestation.
- Transition `REQUESTED → ASSIGNED`, historique, audit et notifications client/prestataire.

### Catalogue

- `admin.categories`, `admin.saveCategory`, `admin.services`, `admin.saveService`, `admin.zones`, `admin.saveZone`.
- Règles de prix centralisées : prix fixe positif, pas de prix fixe avec diagnostic obligatoire, pas de prix fixe sur devis.
- Slugs normalisés, unicité en base, activation/désactivation, ordre d’affichage.
- Audit `catalog.category|service|zone.create|update`.

### Réclamations

- Table `complaints` avec statut `open|in_progress|resolved|dismissed`, statut précédent de la demande et note de résolution.
- `complaints.mine`, `complaints.create` côté client ; `admin.complaints`, `admin.resolveComplaint` côté admin.
- Une réclamation active maximum par demande ; passage en `CLAIM_OPEN` puis restauration du statut précédent à la clôture.
- Le client ne voit que ses réclamations ; le prestataire affecté et le client sont notifiés sans adresse précise.

### Remboursements

- Table `refunds` avec contrainte d’unicité sur `paymentId`.
- `admin.refunds`, `admin.createRefund`, `admin.processRefund`.
- Paiement confirmé uniquement, demande en `REFUND_PENDING`, confirmation en `REFUNDED` avec paiement `refunded`, rejet avec restauration du statut précédent.
- `admin.transitionPayment` n’accepte plus que `confirmed|failed` : plus de remboursement direct.

### Interface

- `/admin` : onglets Avis, Signalements, Prestataires, Demandes, Catalogue, Réclamations, Remboursements, Paiements, Analyse.
- Nouveaux composants `admin-providers-panel`, `admin-catalog-panel`, `admin-complaints-panel`, `admin-refunds-panel`; affectation intégrée à `admin-requests-panel`.
- `/requests` côté client : statuts `CLAIM_OPEN`, `REFUND_PENDING`, `REFUNDED`, formulaire et suivi de réclamation.

### Règles partagées

`server/workflows.ts` centralise les statuts éligibles, les transitions autorisées, la validation tarifaire, la normalisation de slug et la restauration de statut. Les tests unitaires couvrent ces règles.

## API ajoutée

| Procédure | Accès |
| --- | --- |
| `admin.providers` | admin |
| `admin.reviewProvider` | admin |
| `admin.assignableProviders` | admin |
| `admin.assignRequest` | admin |
| `admin.categories` / `saveCategory` | admin |
| `admin.services` / `saveService` | admin |
| `admin.zones` / `saveZone` | admin |
| `admin.complaints` / `resolveComplaint` | admin |
| `admin.refunds` / `createRefund` / `processRefund` | admin |
| `complaints.mine` / `complaints.create` | client authentifié |

## Migration

`drizzle/0012_natural_shadow_king.sql` :

- `CREATE TABLE complaints` + index `(requestId, status, createdAt)`, `(customerId, createdAt)` ;
- `CREATE TABLE refunds` + index `(requestId, status, createdAt)` et unicité `paymentId` ;
- `ALTER TABLE providerProfiles` : `verificationNote`, `verifiedBy`, `verifiedAt` ;
- clés étrangères vers `serviceRequests`, `users`, `payments`.

Migration additive, appliquée sur la base de recette `barahub_recette` (MariaDB 11.4.5) le 22 octobre 2026.

## Validation

- `pnpm check` : OK.
- `pnpm lint` : OK.
- `pnpm test` avec `BARAHUB_TEST_DATABASE_URL` : 76 réussis, 0 ignoré.
  - `tests/workflows.test.ts` : 11 tests.
  - `tests/admin.pilot.authorization.test.ts` : 6 tests.
  - `tests/pilot.multi-account.integration.test.ts` : 4 tests persistés.
  - `tests/pilot.checklist.integration.test.ts` : 5 tests persistés.
  - `tests/auth.logout.test.ts` : 1 test de déconnexion réactivé et vert.
- Migrations et seed appliqués sur `barahub_recette` (13 migrations, seed 5 catégories / 3 prestations / 5 zones).
- `check`, `lint` et `build` verts.
- Reprise des 13 migrations sur une base vide isolée et restauration de sauvegarde vérifiée.
- Bilan consolidé : `docs/pilot-validation-report.md`.

## Reste ouvert

- Validation manuelle de l’interface sur navigateur/appareil avec comptes de recette + admin : `docs/pilot-ui-mobile-checklist.md` (contrôles initialement `BLOCKED`).
- Sauvegarde/restauration de la production et validation sur l’hébergement réel : `docs/backup-restore-runbook.md`.
- Paramétrage général du taux de commission dans l’interface.
- Justificatifs de vérification et gestion complète des disponibilités.
- Paiements/remboursements réels, WhatsApp Business, e-mail et push natif.
