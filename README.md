# Barahub 🔨

> L'artisan qu'il vous faut, quand vous en avez besoin.

Marketplace d'artisans vérifiés en Côte d'Ivoire. Trouvez un électricien, plombier, menuisier ou tout autre artisan de confiance à Abidjan et dans les grandes villes ivoiriennes.

## 🌐 Production

**[barahub.pro](https://barahub.pro)**

## ✨ Fonctionnalités MVP

- 🔍 Recherche d'artisans par catégorie et commune
- ⭐ Profils artisans avec notes et avis
- 💬 Messagerie client-artisan
- 📋 Demandes de devis
- 🚨 Dépannage urgent (15 min)
- 📱 Paiement Orange Money / Wave / MTN MoMo
- 🔐 Authentification Supabase

## 🛠 Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Style | Tailwind CSS |
| Routing | Wouter |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Hébergement | GitHub Pages |
| Domaine | barahub.pro (LWS) |
| CI/CD | GitHub Actions |

## 🚀 Démarrage local

```bash
# 1. Cloner
git clone https://github.com/Samsforg/Barahub.app.git
cd Barahub.app

# 2. Installer les dépendances
npm install

# 3. Variables d'environnement
cp .env.example .env
# Remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

# 4. Lancer en développement
npm run dev
```

## 🗄️ Base de données (Supabase)

Tables principales :
- `profiles` — Comptes utilisateurs
- `categories` — Catégories d'artisans (15 catégories)
- `artisans` — Profils artisans avec rating
- `services` — Services par catégorie
- `messages` — Messagerie temps réel
- `quote_requests` — Demandes de devis
- `reviews` — Avis clients (met à jour le rating automatiquement)
- `urgent_requests` — Dépannage urgence
- `mobile_payments` — Paiements Mobile Money
- `notifications` — Notifications push

## ⚙️ Déploiement GitHub Pages

Le déploiement est automatique via GitHub Actions à chaque push sur `main`.

Variables secrets à configurer dans GitHub → Settings → Secrets :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 🗺️ DNS LWS → barahub.pro

Dans le panneau LWS, ajouter un enregistrement CNAME :
```
Nom  : @  (ou www)
Type : CNAME
Valeur : samsforg.github.io
TTL  : 3600
```

---

**Barahub** — Construire le premier groupe tech africain, une startup à la fois.
