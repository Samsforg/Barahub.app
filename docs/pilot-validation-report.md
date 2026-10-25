# Rapport final de validation — pilote Barahub

## Verdict

**La validation technique automatisée de la recette est verte. Le pilote n’est pas encore validé pour la production.**

Motifs :

- 76 tests réussis, 0 ignoré avec la base de recette ;
- `check`, `lint` et `build` verts ;
- 13 migrations rejouées sur une base vide isolée ;
- sauvegarde et restauration testées sur une base isolée ;
- mais dépôt Git absent, checklist UI/mobile non exécutée et restauration de production non testée.

Aucune opération de production, aucun déploiement et aucune publication n’ont été effectués.

## 1. Contrôles exécutés

### Environnement

- Date : 22 octobre 2026.
- Projet : `C:\Users\Utilisateur\Downloads\barahub`.
- Base : MariaDB 11.4.5 portable, instance isolée `127.0.0.1:3307`.
- Base de recette : `barahub_recette`.
- Aucun dépôt Git : `git status` renvoie `fatal: not a git repository`.
- Aucune modification de production.

### Commandes et résultats

```powershell
npx --yes pnpm@9.12.0 run check
npx --yes pnpm@9.12.0 run lint
npx --yes pnpm@9.12.0 run build
$env:BARAHUB_TEST_DATABASE_URL="<url-base-recette>"
node_modules\.bin\vitest.cmd run
```

| Contrôle | Résultat |
| --- | --- |
| `pnpm check` | OK, aucune erreur TypeScript. |
| `pnpm lint` | OK, aucune erreur. |
| `pnpm build` | OK, `dist/index.js` généré, 145,9 Ko. |
| Tests avec base de recette | 15 fichiers, 76 tests réussis, 0 ignoré. |
| Tests sans base dédiée | 13 fichiers, 67 réussis, 2 fichiers et 9 scénarios persistés ignorés, comportement attendu. |
| Base après tests | 0 utilisateur, 0 demande, 0 réclamation, 0 remboursement, 0 audit ; seed 5 catégories, 3 prestations, 5 zones. |

### Migrations

- Les 13 entrées de `drizzle/meta/_journal.json` ont été appliquées sur une base vide isolée `barahub_migration_check_20261022`.
- Résultat : 13 lignes dans `__drizzle_migrations`, 21 tables applicatives et la table de migrations, soit 22 tables.
- Les dates de migration 1 à 13 correspondent aux entrées du journal.
- Aucun échec de migration.

### Audit des identifiants insérés

- Le helper `insertedId(result)` de `server/db.ts` lit `result[0].insertId`, compatible avec la forme `[ResultSetHeader, fields]` de Drizzle/MySQL.
- Les 7 sites concernés utilisent le helper : création de devis, profil prestataire, catégorie, prestation, zone, réclamation et remboursement.
- Aucun `(inserted as any).insertId` brut ne reste dans `server/` ou `tests/`.
- Les contrôles `affectedRows` gèrent déjà les deux formes de résultat et n’ont pas été modifiés.

### Secrets

- Aucun fichier `.env`, `.pem`, `.key`, `.pfx` ou `.p12` trouvé.
- Aucune valeur de secret réelle détectée.
- Les occurrences signalées par le scan sont des placeholders de documentation ou des affectations `process.env`, pas des credentials.
- Aucun secret n’a été ajouté aux documents créés.

## 2. Tests et statut des ignorés

- Avec `BARAHUB_TEST_DATABASE_URL` : **76 réussis, 0 ignoré**.
- Sans base dédiée : **67 réussis, 9 ignorés**, exclusivement les scénarios persistés des deux fichiers pilote.
- `tests/auth.logout.test.ts` était marqué `describe.skip` avec un commentaire obsolète. Le routeur `auth.logout` et les options de cookie ont été vérifiés ; le skip a été retiré et le test passe.
- Aucun test en échec.
- Aucun test n’a été contourné ou rendu artificiellement vert.

## 3. Fichiers modifiés et raisons

| Fichier | Changement | Raison |
| --- | --- | --- |
| `server/db.ts` | `insertedId` et 7 remplacements ; garde de réclamation active | Corrige les identifiants `NaN` et applique la règle déjà documentée d’une seule réclamation active. |
| `tests/pilot.checklist.integration.test.ts` | Ajout de 5 scénarios persistés | Couvre catalogue, diagnostic, affectation, suspension, double réclamation et rejet de remboursement. |
| `tests/pilot.multi-account.integration.test.ts` | Helper `insertedId` | Aligne les fixtures sur la forme réelle du résultat Drizzle. |
| `tests/auth.logout.test.ts` | Suppression de `describe.skip` | Le mécanisme de déconnexion existe ; le test est maintenant exécuté. |
| `docs/pilot-preparation.md` | Comptes de tests corrigés, liens, preuves migrations et restauration | Reflète l’état réel de la recette. |
| `docs/phase-10-admin-pilot-status.md` | Comptes 76/0, test logout, reprise des migrations | Évite de documenter un skip OAuth inexistant. |
| `TODO.md` | Évidence de validation actualisée | Aligne le suivi sur les résultats réels. |
| `docs/pilot-ui-mobile-checklist.md` | Nouveau document | 58 contrôles client, prestataire, admin, mobile et réseau, avec statuts et preuves. |
| `docs/backup-restore-runbook.md` | Nouveau document | Procédure de sauvegarde, restauration isolée, contrôles, retour arrière et preuve locale. |
| `docs/pilot-validation-report.md` | Nouveau document | Ce rapport final. |

Aucun commit n’a été créé : le dossier n’est pas un dépôt Git.

## 4. Anomalies et correctifs

| ID | Sévérité | Anomalie | Correctif | État |
| --- | --- | --- | --- | --- |
| A1 | Majeure | Les créations Drizzle lisaient `insertId` sur le tuple au lieu de `result[0]`, produisant `NaN`. | Helper `insertedId` et remplacement des 7 sites. | Corrigé et couvert par les tests persistés. |
| A2 | Majeure | Une deuxième réclamation active pouvait être créée alors que la règle documentée l’interdit. | Garde transactionnelle et erreur explicite. | Corrigé et couvert. |
| A3 | Mineure | `tests/auth.logout.test.ts` était ignoré par un `describe.skip` obsolète. | Skip retiré après vérification du routeur et des cookies. | Corrigé, test vert. |
| A4 | Mineure, processus | Le premier essai de restauration utilisait un dump `--databases` contenant `USE barahub_recette` ; le client a rejoué le dump dans la base source au lieu de la base isolée. | Dump recréé sans `--databases`, restauration isolée refaite et vérifiée. | Corrigé. La base ne contenait que le seed, le dump avait été pris immédiatement avant et aucune donnée métier n’a été perdue. Aucun impact production. |
| A5 | Bloquante | Le dossier n’est pas un dépôt Git : impossible de vérifier branche, commit, diff ou historique. | Aucun contournement appliqué ; ne pas initialiser ou réécrire l’historique sans décision. | Ouvert. |
| A6 | Bloquante pilote | Les 58 contrôles UI/mobile n’ont pas été exécutés faute de session navigateur/appareil et de comptes OAuth de recette. | Checklist détaillée fournie ; statuts conservés à `BLOCKED`. | Ouvert. |
| A7 | Mineure | La documentation attribuait le test ignoré à OAuth et affichait 75/1. | Comptes et cause corrigés à 76/0. | Corrigé. |

## 5. Contrôles manuels

- 58 contrôles documentés dans `docs/pilot-ui-mobile-checklist.md` :
  - 7 accès et cloisonnement ;
  - 14 parcours client ;
  - 13 parcours prestataire ;
  - 14 parcours admin ;
  - 10 contrôles mobile, réseau et accessibilité.
- **0 contrôle exécuté, 58 statuts `BLOCKED`.**
- Aucun résultat manuel n’est déclaré `PASS`.
- Les preuves attendues, le journal d’anomalies et les critères de sortie sont inclus dans la checklist.

## 6. Sauvegarde et restauration

### Test local

- Dump logique de `barahub_recette` créé hors dépôt.
- Taille : 36 465 octets.
- SHA-256 : `BF91F19CBB6D99D03761C6BC9A30865CA6DFC8B1975B2F161BBC61A5F0E15343`.
- Restauration dans `barahub_restore_check_20261022`.
- Contrôles :

| Élément | Source | Restauration |
| --- | --- | --- |
| Migrations | 13 | 13 |
| Tables | 22 | 22 |
| Catégories | 5 | 5 |
| Prestations | 3 | 3 |
| Zones | 5 | 5 |
| Utilisateurs | 0 | 0 |
| Clés étrangères | 40 | 40 |
| `mariadb-check` | — | Toutes les tables `OK` |

### Prérequis avant production

- Identifier l’hébergement et le moteur réels.
- Adapter le fichier d’identifiants et les chemins.
- Définir et approuver RPO, RTO, rétention et chiffrement.
- Tester la restauration sur un environnement de staging représentatif.
- Vérifier le retour arrière et conserver l’ancienne base jusqu’à validation.
- Obtenir une autorisation explicite avant toute action de production.

## 7. Blocages du pilote

1. **Traçabilité Git absente** : aucun commit, branche ou diff vérifiable.
2. **Validation UI/mobile non exécutée** : 58 contrôles `BLOCKED`, pas de preuve navigateur/appareil.
3. **OAuth de recette non validé** : les parcours de connexion réels n’ont pas été exercés manuellement.
4. **Hébergement de production inconnu** : le runbook est testé localement, pas sur l’infrastructure cible.
5. **Sauvegarde de production non testée** : aucune politique de rétention ou restauration réelle approuvée.
6. **Décision de production non prise** : elle doit être explicite après les points ci-dessus.

## 8. Actions suivantes priorisées

### P0 — avant toute décision de production

1. Restaurer un dépôt Git de référence ou fournir le commit de base ; relancer l’audit du diff sans réécrire l’historique.
2. Exécuter les 58 contrôles UI/mobile avec cinq comptes fictifs, un navigateur et un appareil réel, puis archiver les preuves.
3. Configurer ou valider le fournisseur OAuth de recette et exécuter les parcours de connexion/déconnexion.
4. Identifier l’hébergement réel, adapter `docs/backup-restore-runbook.md` et tester une restauration sur staging.
5. Faire approuver RPO, RTO, rétention, chiffrement et responsabilités de sauvegarde.

### P1 — avant ouverture du pilote

6. Corriger les anomalies issues de la checklist et rejouer les scénarios concernés.
7. Décider du périmètre de pilote, des zones actives, des prestataires vérifiés et des catégories réellement couvertes.
8. Mettre en place la supervision des erreurs et un contact d’astreinte.
9. Après conservation des preuves et autorisation, supprimer les bases de contrôle locales `barahub_migration_check_20261022` et `barahub_restore_check_20261022`, ainsi que le dump temporaire.

### P2 — après validation

10. Documenter les résultats manuels dans `TODO.md` et `docs/phase-10-admin-pilot-status.md`.
11. Planifier un test de restauration récurrent et un exercice de retour arrière.
12. Réévaluer les éléments hors périmètre : paiements réels, notifications externes, justificatifs de vérification, disponibilités complètes.

## Critères de sortie

| Critère | État |
| --- | --- |
| `check`, `lint`, `build` verts | `PASS` |
| Tests complets avec base dédiée | `PASS` — 76/76 |
| Reprise des 13 migrations sur base vide | `PASS` |
| Sauvegarde/restauration isolée | `PASS` — locale uniquement |
| Audit des insertions et des secrets | `PASS` |
| Traçabilité Git | `BLOCKED` |
| Checklist UI/mobile | `BLOCKED` — 0/58 exécuté |
| Restauration de production | `BLOCKED` |
| Décision de production | `NON PRISE` |

**Conclusion : la recette technique est validée ; le passage en production reste bloqué par la traçabilité, la validation manuelle et la sauvegarde de l’environnement réel.**
