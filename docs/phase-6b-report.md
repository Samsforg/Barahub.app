# BARAHUB — PHASE 6B : VALIDER MYSQL

Date : 23 octobre 2026

## 1. État Git initial et final

| Élément | Valeur |
|---------|--------|
| Branche | `refonte-expo` |
| HEAD | `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe` |
| Fichier indexé | `pnpm-lock.yaml` (un seul, `A`) |

Aucun commit, push, déploiement ou changement de branche n'a été effectué.

## 2. Disponibilité de MySQL

**MySQL n'est pas disponible dans l'environnement local.**

Vérifications effectuées :
- Aucun service MySQL/MariaDB détecté
- Port `3306` fermé
- Commandes `docker`, `mysqld`, `mariadb` indisponibles
- Variable d'environnement `BARAHUB_TEST_DATABASE_URL` absente

Conséquence : les 9 tests d'intégration ne peuvent pas être exécutés localement. Aucune base de données n'a été créée, installée ou modifiée. Aucune base de production n'a été utilisée.

## 3. Analyse des tests d'intégration

### Fichiers concernés

| Fichier | Tests | Condition d'exécution |
|---------|-------|----------------------|
| `tests/pilot.checklist.integration.test.ts` | 5 | Ignorés si `BARAHUB_TEST_DATABASE_URL` absent |
| `tests/pilot.multi-account.integration.test.ts` | 4 | Ignorés si `BARAHUB_TEST_DATABASE_URL` absent |

Total : 9 tests d'intégration conditionnés par `BARAHUB_TEST_DATABASE_URL`.

### Mécanisme de conditionnement

Dans les deux fichiers :

```typescript
const testDatabaseUrl = process.env.BARAHUB_TEST_DATABASE_URL;
const suite = testDatabaseUrl ? describe : describe.skip;
```

Lorsque `BARAHUB_TEST_DATABASE_URL` est défini, les tests s'exécutent. Sinon, ils sont ignorés (`describe.skip`).

### Adaptation à la base `barahub_test`

Les tests sont adaptés à une base dédiée :

1. **Lecture de l'URL de test** : `BARAHUB_TEST_DATABASE_URL` est lue depuis l'environnement.
2. **Assignment à DATABASE_URL** : Dans `pilot.multi-account.integration.test.ts` (ligne 48) : `process.env.DATABASE_URL = testDatabaseUrl;` — le module `getDb()` utilise `DATABASE_URL`.
3. **Préfixe unique par exécution** : Un `suffix` basé sur `Date.now()` et `Math.random()` est généré pour isoler les données entre exécutions.
4. **Nettoyage** : `afterAll` est présent pour nettoyer les données de test après exécution.

Le workflow CI `ci.yml` configure les deux variables :
- `BARAHUB_TEST_DATABASE_URL=mysql://root:root@127.0.0.1:3306/barahub_test`
- `DATABASE_URL=mysql://root:root@127.0.0.1:3306/barahub_test`

## 4. Analyse des migrations Drizzle

### Configuration (`drizzle.config.ts`)

- Dialecte : `mysql`
- Schéma : `./drizzle/schema.ts`
- Sortie : `./drizzle`
- Requiert `DATABASE_URL` (lève une erreur si absente)

### Commande de migration

Le workflow CI exécute :
```
corepack pnpm exec drizzle-kit migrate
```
avec `DATABASE_URL=mysql://root:root@127.0.0.1:3306/barahub_test`

Le script `package.json` `db:push` contient :
```
drizzle-kit generate && drizzle-kit migrate
```

### Vérification de compatibilité

Les migrations sont compatibles avec une base dédiée `barahub_test` :
- `drizzle-kit migrate` applique les migrations sur la base pointée par `DATABASE_URL`
- Aucune référence en dur à une base de production
- La base `barahub_test` doit exister avant l'exécution des migrations

## 5. Procédure de préparation MySQL (quand disponible)

**Aucune installation ni modification du système n'est effectuée à ce stade.** Les étapes ci-dessous sont à exécuter manuellement quand MySQL sera disponible.

### Étape 1 : Installer/démarrer MySQL 8

Installer MySQL 8 (ou utiliser un service MySQL distant isolé) et démarrer le service sur le port 3306.

### Étape 2 : Créer une base de test isolée

Créer une base de données nommée `barahub_test`, dédiée aux tests, distincte de toute base de production.

Ne pas utiliser une base de production existante. Ne pas supprimer ni réinitialiser une base existante.

### Étape 3 : Configurer les variables d'environnement

Définir :
```
BARAHUB_TEST_DATABASE_URL=mysql://<user>:<password>@<host>:3306/barahub_test
DATABASE_URL=mysql://<user>:<password>@<host>:3306/barahub_test
```

Ne pas communiquer de mots de passe en clair. Utiliser des valeurs adaptées à l'environnement local.

### Étape 4 : Appliquer les migrations

Exécuter :
```
corepack pnpm exec drizzle-kit migrate
```

Cela appliquera les schémas Drizzle sur la base `barahub_test`.

### Étape 5 : Exécuter les tests d'intégration

Exécuter :
```
corepack pnpm exec vitest run
```

Les 9 tests d'intégration (5 + 4) s'exécuteront alors au lieu d'être ignorés.

## 6. Résultats des commandes exécutées

Aucune commande de test MySQL n'a pu être exécutée car MySQL est indisponible.

Les commandes de validation non-MySQL ont été exécutées avec succès en Phase 5B :
- `corepack pnpm install --frozen-lockfile` : Réussi
- `corepack pnpm exec eslint .` : 0 erreurs, 13 avertissements
- `corepack pnpm exec tsc --noEmit` : Réussi (0 erreur)
- `corepack pnpm exec vitest run` : 86 tests réussis, 9 ignorés (MySQL indisponible), 15 fichiers
- `corepack pnpm build` : Réussi, 147,6 ko

## 7. Risques résiduels

| Risque | Description | Gravité |
|--------|-------------|---------|
| MySQL indisponible | Les 9 tests d'intégration ne peuvent pas être exécutés localement | Élevée |
| Aucune base de test créée | La base `barahub_test` n'existe pas dans l'environnement actuel | Élevée |
| Aucune validation distante | Le workflow CI n'a pas été exécuté sur GitHub Actions | Moyenne |

## 8. Verdict

**BLOQUÉ**

Justification :
- MySQL n'est pas installé ni accessible dans l'environnement local.
- Les 9 tests d'intégration ne peuvent pas être exécutés sans une base `barahub_test`.
- Aucune base de test n'a été créée (conformément à la règle de ne pas modifier le système ni inventer de chaîne de connexion).
- La procédure de préparation est documentée ci-dessus et peut être exécutée quand MySQL sera disponible.

## 9. Contrôle final

- `git status --short` : modifications locales préservées, seul `pnpm-lock.yaml` indexé
- `git branch --show-current` → `refonte-expo`
- `git rev-parse HEAD` → `8d6e328011fe3a74c30e1d977faf0cc7f69b66fe`
- `git diff --cached --name-status` → `A pnpm-lock.yaml`
- `git diff --cached --check` → OK

**Confirmation : aucun commit, push, déploiement ou changement de branche n'a été effectué.**
