# Runbook sauvegarde et restauration — Barahub

## Statut

- **Procédure préparée et testée sur la recette locale MariaDB 11.4.5 le 22 octobre 2026.**
- **Aucune restauration de production n’a été exécutée.**
- L’hébergement et le moteur de production ne sont pas encore identifiés dans le dépôt. Adapter les chemins, comptes et outils avant toute utilisation réelle.
- Toute opération sur une base de production exige une autorisation écrite, une fenêtre de maintenance et une sauvegarde vérifiée.

## Périmètre

Inclus :

- schéma MySQL/MariaDB et données applicatives ;
- migrations Drizzle et table `__drizzle_migrations` ;
- utilisateurs, demandes, devis, paiements, réclamations, remboursements, messages, notifications et journaux ;
- vérification de l’intégrité après restauration.

Exclus :

- fichiers du dépôt et variables d’environnement ;
- secrets OAuth, secrets de session et identifiants de base ;
- éventuels objets externes, pièces jointes ou sauvegardes du fournisseur ;
- données de prestataires de paiement réels, non intégrés au pilote.

## Objectifs proposés, à valider avant le pilote

| Objectif | Cible proposée | Décision |
| --- | --- | --- |
| Fréquence | Sauvegarde complète quotidienne + avant chaque migration | À valider |
| Rétention | 30 jours hors site, avec au moins 7 jours en ligne | À valider |
| RPO | 24 heures maximum | À valider |
| RTO | 2 heures maximum | À valider |
| Test de restauration | Avant le pilote, puis au moins une fois par trimestre | À valider |

Ne pas présenter ces cibles comme acquises tant qu’elles ne sont pas approuvées.

## Prérequis

1. Opérateur autorisé et second relecteur pour la production.
2. Fenêtre de maintenance annoncée.
3. Base source identifiée : nom, version du moteur, hôte, port et nombre de migrations.
4. Espace disque égal à au moins trois fois la taille estimée du dump.
5. Outils `mariadb-dump`, `mysql` et `mariadb-check` disponibles.
6. Fichier d’identifiants hors dépôt, lisible uniquement par l’opérateur.
7. Destination de sauvegarde chiffrée, hors du serveur applicatif.
8. Procédure de retour arrière et base précédente conservée.
9. Aucun secret dans le dépôt, le nom du fichier, le journal ou la commande affichée.

## Fichier d’identifiants

Créer un fichier hors du dépôt, par exemple `C:\secrets\barahub-backup.cnf`, avec des permissions restreintes :

```ini
[client]
host=127.0.0.1
port=3306
user=barahub_backup
password=<mot-de-passe-renseigne-hors-depot>
```

Ne jamais passer le mot de passe directement en ligne de commande, ne jamais le coller dans un terminal partagé et ne jamais committer ce fichier.

## Procédure de sauvegarde

### 1. Précontrôles

```powershell
mysql --defaults-extra-file=$cnf -e "SELECT VERSION();"
mysql --defaults-extra-file=$cnf $sourceDb -e "SELECT COUNT(*) AS migrations FROM __drizzle_migrations;"
mysql --defaults-extra-file=$cnf $sourceDb -e "SELECT COUNT(*) AS tables_count FROM information_schema.tables WHERE table_schema = '$sourceDb';"
```

Renseigner dans le journal : date, opérateur, base, version, nombre de migrations, nombre de tables, taille estimée.

### 2. Dump logique

```powershell
$dump = "D:\backups\barahub-$sourceDb-$(Get-Date -Format 'yyyyMMdd-HHmm').sql"
& $mariadbDump --defaults-extra-file=$cnf `
  --single-transaction --quick --routines --triggers --events `
  --hex-blob --default-character-set=utf8mb4 `
  --result-file=$dump `
  $sourceDb
```

Points obligatoires :

- `--single-transaction` pour un instantané cohérent des tables InnoDB ;
- `--routines --triggers --events` pour ne pas perdre les objets serveur ;
- `--hex-blob` et `utf8mb4` pour préserver les données ;
- **ne pas utiliser `--databases`** : le dump contiendrait `CREATE DATABASE` et `USE sourceDb`, ce qui ferait restaurer vers la base source même si un autre nom est fourni au client.
- `--result-file` écrit les octets directement, sans passer par la redirection texte de PowerShell.

### 3. Vérifier et protéger la copie

```powershell
Get-Item -LiteralPath $dump | Select-Object FullName, Length, LastWriteTime
Get-FileHash -LiteralPath $dump -Algorithm SHA256
```

Contrôles :

- le fichier existe et sa taille est non nulle ;
- le SHA-256 est enregistré dans le manifeste ;
- le dump est lisible par l’opérateur uniquement ;
- une copie chiffrée est envoyée hors site ;
- la rétention est appliquée sans supprimer la dernière copie vérifiée.

Exemple de manifeste, sans secret :

```text
date_utc,base,moteur,version,migrations,tables,taille_octets,sha256,operateur,destination,retention
```

### 4. Journal de sauvegarde

Consigner au minimum : identifiant de sauvegarde, heure de début et de fin, résultat, hash, emplacement, opérateur, incident éventuel et date du prochain test de restauration.

## Procédure de restauration

### Principe

Restaurer d’abord dans une base isolée, vérifier, puis seulement envisager un basculement avec autorisation. Ne jamais restaurer directement au-dessus de la base active.

### 1. Créer une base isolée

```sql
CREATE DATABASE barahub_restore_YYYYMMDD_HHMM
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Le nom doit être unique. Ne pas réutiliser une base existante sans autorisation.

### 2. Restaurer le dump

```powershell
$restoreDb = "barahub_restore_YYYYMMDD_HHMM"
$mysql = "C:\chemin\vers\mysql.exe"
$dump = "D:\backups\barahub-....sql"

$process = Start-Process -FilePath $mysql `
  -ArgumentList @("--defaults-extra-file=$cnf", $restoreDb) `
  -RedirectStandardInput $dump `
  -NoNewWindow -Wait -PassThru

if ($process.ExitCode -ne 0) { throw "Restauration échouée: $($process.ExitCode)" }
```

`Start-Process -RedirectStandardInput` transmet le fichier en octets. Ne pas utiliser `Get-Content ... | mysql` : la conversion de texte peut altérer l’encodage ou les données binaires.

### 3. Vérifications d’intégrité

```powershell
& $mariadbCheck --defaults-extra-file=$cnf --check $restoreDb
```

Puis comparer la source et la restauration :

```sql
SELECT COUNT(*) FROM __drizzle_migrations;
SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = 'barahub_restore_YYYYMMDD_HHMM';
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM serviceRequests;
SELECT COUNT(*) FROM complaints;
SELECT COUNT(*) FROM refunds;
SELECT COUNT(*) FROM adminAuditLogs;
SELECT COUNT(*) FROM categories;
SELECT COUNT(*) FROM services;
SELECT COUNT(*) FROM zones;
SELECT COUNT(*) FROM information_schema.referential_constraints
  WHERE constraint_schema = 'barahub_restore_YYYYMMDD_HHMM';
```

Critères :

- nombre de migrations identique à la source ;
- nombre de tables identique ;
- comptes des tables critiques identiques ;
- contraintes de clés étrangères présentes ;
- `mariadb-check` renvoie `OK` pour chaque table ;
- aucune erreur d’encodage sur les accents ;
- les montants et statuts critiques sont identiques.

### 4. Vérification applicative

1. Démarrer une instance applicative temporaire avec `DATABASE_URL` pointant vers la base restaurée.
2. Ne pas modifier la configuration de la recette ou de la production.
3. Ouvrir le catalogue et vérifier les 5 catégories, 3 prestations et 5 zones du seed.
4. Se connecter avec un compte de recette et vérifier une demande, une réclamation et un remboursement.
5. Vérifier que les routes admin refusent toujours un compte non admin.
6. Arrêter l’instance temporaire.

### 5. Basculement éventuel

Un basculement vers la base restaurée exige :

- validation des étapes précédentes ;
- autorisation explicite ;
- fenêtre de maintenance ;
- sauvegarde de la base active avant changement ;
- modification de `DATABASE_URL` uniquement par le canal de configuration autorisé ;
- surveillance des erreurs applicatives après bascule.

### 6. Retour arrière

- Conserver la base active et son dump jusqu’à validation complète.
- En cas d’échec, rétablir l’ancienne `DATABASE_URL`.
- Ne pas supprimer la base restaurée ni l’ancienne base pendant l’incident.
- Consigner l’incident et conserver les journaux.

## Preuve de test locale du 22 octobre 2026

Environnement :

- MariaDB 11.4.5 portable, instance isolée `127.0.0.1:3307` ;
- base source `barahub_recette` contenant 13 migrations et le seed ;
- dump créé dans le dossier temporaire hors dépôt ;
- base de restauration isolée `barahub_restore_check_20261022` ;
- aucune donnée de production utilisée.

Résultats :

| Contrôle | Source | Restauration |
| --- | --- | --- |
| Migrations | 13 | 13 |
| Tables, table de migrations incluse | 22 | 22 |
| Catégories | 5 | 5 |
| Prestations | 3 | 3 |
| Zones | 5 | 5 |
| Utilisateurs | 0 | 0 |
| Contraintes de clés étrangères | 40 | 40 |
| `mariadb-check` | — | Toutes les tables `OK` |

Dump :

- taille : 36 465 octets ;
- SHA-256 : `BF91F19CBB6D99D03761C6BC9A30865CA6DFC8B1975B2F161BBC61A5F0E15343` ;
- emplacement : dossier temporaire hors dépôt, non versionné ;
- aucune donnée métier réelle.

Piège confirmé pendant le test : un premier dump généré avec `--databases` contenait `USE barahub_recette`. Lors de la restauration, le client a ignoré la base cible et rejoué le dump dans la base source. Le dump avait été pris immédiatement avant et la base ne contenait que le seed ; les contrôles ont confirmé 13 migrations et les comptes 5/3/5. La procédure retenue supprime `--databases` et restaure dans une base explicitement nommée. Ne jamais reproduire ce mode sur une base contenant des données métier.

## Limites connues

- Aucun hébergement de production n’est identifié.
- Aucune sauvegarde physique, réplication ou restauration à un instant précis n’est configurée.
- Les exports ne contiennent que les données logiques ; les objets externes ne sont pas couverts.
- Le test local ne remplace pas un test sur l’infrastructure réelle.
- Les secrets et fichiers d’identifiants ne doivent jamais être inclus dans un dump ou un dépôt.

## Critères de validation avant pilote

- [ ] Une sauvegarde complète récente existe et son hash est enregistré.
- [ ] Une restauration isolée a été exécutée sur le moteur réel.
- [ ] Les nombres de migrations, tables et données critiques concordent.
- [ ] `mariadb-check` est vert.
- [ ] L’application démarre sur la base restaurée et les parcours critiques fonctionnent.
- [ ] Le retour arrière a été relu par une seconde personne.
- [ ] La rétention, le chiffrement et l’accès aux sauvegardes sont approuvés.
- [ ] La décision de production est prise explicitement, hors de ce runbook.
