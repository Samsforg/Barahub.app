# Barahub — Phase 4B : Lockfile et validation CI

Date : 23 octobre 2026

## 1. Objectif

Vérifier que le lockfile et le workflow CI sont prêts pour une validation distante, sans commit, push ni déploiement.

## 2. Protection Git

Commandes exécutées :

- `git branch --show-current` → `refonte-expo`.
- `git status --short` → état volumineux, avec de nombreux changements de migration encore présents.
- `git diff --cached --name-status` → aucune ligne avant staging.
- `git ls-files -- pnpm-lock.yaml` → aucune ligne, donc non suivi.
- `git check-ignore -v pnpm-lock.yaml` → non ignoré.
- `git add -- pnpm-lock.yaml` → exécuté après contrôles.
- `git diff --cached --name-status` → `A pnpm-lock.yaml`.
- `git diff --cached --check` → OK.
- `git diff --cached --stat` → `pnpm-lock.yaml | 12746 ++++++++++++++++++++++++`.

Le lockfile a été inspecté pour des motifs de secret connus :

- clé privée
- jeton GitHub (`ghp_...`, `gho_...`, etc.)
- clé OpenAI (`sk_...`)
- AWS access key (`AKIA...`)
- token Slack (`xox[baprs]-...`)

Aucun motif de secret n’a été trouvé dans `pnpm-lock.yaml`.

## 3. Lockfile

- Fichier : `pnpm-lock.yaml`.
- Version : `9.0`.
- `packageManager` : `pnpm@9.12.0`.
- CI pnpm : `9.12.0`.
- `.npmrc` : `node-linker=hoisted`.
- Absence de `pnpm-workspace.yaml`.
- Overrides présents dans le lockfile :
  - `body-parser: 1.20.6`
  - `path-to-regexp: 0.1.13`
  - `qs: 6.16.1`
  - `shell-quote: 1.12.0`.

Contrôle local déjà validé :

- `corepack pnpm install --frozen-lockfile` → OK.

## 4. Audit du workflow CI

Workflow inspecté : `.github/workflows/ci.yml`.

Points vérifiés :

- Node : `24`.
- pnpm : `9.12.0`.
- Installation : `pnpm install --frozen-lockfile`.
- Service MySQL : `mysql:8`.
- Base : `barahub_test`.
- Healthcheck MySQL :
  - `mysqladmin ping -h localhost -proot`
  - intervalle `10s`
  - timeout `5s`
  - retries `10`.
- Migration : `corepack pnpm exec drizzle-kit migrate` avec `DATABASE_URL=mysql://root:root@127.0.0.1:3306/barahub_test`.
- Variables de test :
  - `BARAHUB_TEST_DATABASE_URL=mysql://root:root@127.0.0.1:3306/barahub_test`
  - `DATABASE_URL=mysql://root:root@127.0.0.1:3306/barahub_test`.
- Aucun déploiement automatique.
- Aucun secret réel dans le workflow.

Le YAML du workflow a été parsé avec succès.

## 5. Validation locale

Validations réellement effectuées :

- `corepack pnpm install --frozen-lockfile` → OK.
- `corepack pnpm check` → OK.
- `corepack pnpm lint` → 0 erreur, 13 avertissements.
- `corepack pnpm test` → 86 tests réussis, 9 tests d’intégration ignorés.
- `corepack pnpm build` → OK, bundle `dist/index.js` de 147,6 ko.

MySQL local :

- Service absent.
- Port `3306` fermé.
- `BARAHUB_TEST_DATABASE_URL` absent.
- Tests d’intégration donc non exécutés localement.

Aucune base de production n’a été utilisée.

## 6. Fichiers indexés

Seul le fichier suivant a été indexé :

- `pnpm-lock.yaml`.

Aucun autre fichier n’a été ajouté à l’index.

## 7. Problèmes restants

- Le workflow CI n’a pas encore été exécuté à distance.
- La validation distante reste conditionnée à un commit/push, non effectué ici.
- Les tests d’intégration ne sont pas encore exécutés localement faute de base MySQL.
- Les identifiants OAuth réels restent absents.
- L’audit de dépendances résiduel n’est pas entièrement clos.

## 8. Commandes pour poursuivre

```bash
git status --short
git diff --cached --name-status
git branch --show-current
git log -1 --oneline
```

## 9. Conclusion

Le lockfile est prêt localement pour une installation reproductible et le workflow CI est structuré pour une validation distante avec MySQL 8.

Verdict Phase 4B : **LOCKFILE VALIDÉ LOCALEMENT ET INDEXATION LIMITÉE EFFECTUÉE**.
