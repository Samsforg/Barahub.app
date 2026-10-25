# Barahub — validation PWA et performance

Date de mesure : 22 octobre 2026. Les mesures sont réalisées dans le Sandbox sur le Preview Metro `8081` et l’API `3000`; elles servent de baseline reproductible, pas de garantie de débit sur tous les téléphones ou réseaux 3G/4G.

## Optimisations livrées

- Manifest installable en français (`public/manifest.webmanifest`) avec affichage standalone, thème Barahub, icônes et raccourci « Créer une demande ».
- Métadonnées Web et lien manifest dans `app/+html.tsx`.
- Service worker limité aux ressources publiques statiques : manifest, manifeste de routes, favicon, assets Expo et polices/images publiques. Il ne met jamais en cache `/api/` ni les pages ou données privées client, prestataire et administration.
- Manifeste `public/manus-routes.json` couvrant les routes publiques et protégées sans inventer d’identifiants.
- Conservation mémoire de 15 minutes pour les petites réponses React Query; les données privées gardent leur invalidation explicite et ne sont pas persistées hors ligne.
- Script reproductible `pnpm perf`, configurable avec `PREVIEW_URL`, `API_URL`, `PERF_SAMPLES` et `EXPORT_DIR`.

## Résultats

Export Web après les changements :

- Export Expo : environ **11,4 s** dans le Sandbox, contre environ **39,0 s** sur le premier export froid observé; la différence inclut le cache local Metro et n’est pas attribuée entièrement au code PWA.
- JavaScript exporté : **3 133 136 octets**, budget **3 500 000**.
- CSS exporté : **14 888 octets**, budget **100 000**.
- Manifest : **875 octets**, HTTP 200.
- Manifeste de routes : **730 octets**, HTTP 200.
- Service worker : **1 479 octets**.

Mesure `pnpm perf` avec 7 échantillons :

| Cible | Statut | Octets max | P50 | P95 |
|---|---:|---:|---:|---:|
| Preview `/` | 200 | 70 949 | 462,7 ms | 691,3 ms |
| Preview `/manifest.webmanifest` | 200 | 875 | 1,7 ms | 4,0 ms |
| Preview `/manus-routes.json` | 200 | 730 | 1,6 ms | 1,9 ms |
| API `auth.me` | 200 | 33 | 1,8 ms | 4,6 ms |
| API `catalog.list` | 200 | 1 081 | 41,4 ms | 702,3 ms |

Le P95 du catalogue respecte le budget local de 1 seconde. Le pic est compatible avec une première requête froide MySQL/Metro; il faudra mesurer à nouveau sur une instance publiée et sur un appareil Android d’entrée de gamme avant de fixer un SLO de production.

## Contrôles exécutés

- `pnpm check` : réussi.
- `pnpm lint` : réussi; avertissements pnpm/ESM préexistants uniquement.
- `pnpm test` : tests métier et contrat PWA inclus.
- `pnpm perf` : budgets export et timings validés.
- `pnpm exec expo export --platform web --output-dir /tmp/barahub-web-export` : réussi.
- `GET /`, `/manifest.webmanifest`, `/manus-routes.json` et `/sw.js` : HTTP 200.

## Limites et suite

Le service worker ne met pas en cache les documents HTML ni les réponses API : un écran privé ne peut donc pas être consulté hors ligne avec des données périmées. Les mutations de commande, devis, paiement et annulation restent exclusivement en ligne et validées côté serveur. L’étape suivante de performance est une mesure réelle sur appareils/réseaux pilotes, suivie d’une éventuelle réduction du bundle d’icônes si le coût de téléchargement observé le justifie.
