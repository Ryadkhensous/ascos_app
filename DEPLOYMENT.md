# Guide Complet de Déploiement en Production - ASCOS Backend

Ce guide vous explique étape par étape comment déployer votre serveur backend en ligne pour avoir une **connexion rapide, sécurisée (HTTPS)** et des **téléchargements fluides** pour l'application mobile Flutter.

---

## Option 1 : Déploiement sur Render.com (Le plus simple & gratuit/économique)

[Render.com](https://render.com) héberge votre API sur des serveurs à **Francfort (Europe)** avec un certificat HTTPS/SSL automatique et un CDN mondial.

### Étapes :
1. **Créer un compte** gratuit sur [render.com](https://render.com).
2. **Pousser votre code sur GitHub** (dépôt public ou privé).
3. Sur votre tableau de bord Render :
   - Cliquez sur **New +** > **Web Service**.
   - Connectez votre dépôt GitHub `A.S.C.O.S` ou `ascos-backend`.
4. Renseignez les paramètres suivants :
   - **Name** : `ascos-backend`
   - **Region** : `Frankfurt (EU Central)` *(Pour un ping très bas)*
   - **Branch** : `main` ou `master`
   - **Root Directory** : `ascos-backend` (si le repo contient mobile + backend) ou laisser vide
   - **Runtime** : `Node`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
   - **Plan** : `Free` ou `Starter` (7$/mois pour ne jamais être mis en veille)
5. Cliquez sur **Create Web Service**.
6. Dès que le déploiement est terminé (environ 2 minutes), Render vous donne une URL sécurisée du type :
   `https://ascos-backend-xxxx.onrender.com`

---

## Option 2 : Déploiement sur Railway.app (Déploiement en 1 Clic)

1. Rendez-vous sur [railway.app](https://railway.app) et connectez-vous avec GitHub.
2. Cliquez sur **New Project** > **Deploy from GitHub repo**.
3. Sélectionnez votre projet. Railway détectera automatiquement le fichier `railway.json` et le `package.json`.
4. Dans l'onglet **Settings** de votre service sur Railway, cliquez sur **Generate Domain**.
5. Vous obtenez votre URL : `https://ascos-backend-production.up.railway.app`.

---

## Option 3 : Déploiement sur un VPS dédié (OVHcloud ou Hetzner) avec Docker

Si vous avez loué un VPS chez OVHcloud ou Hetzner avec Ubuntu :

1. Connectez-vous en SSH à votre serveur :
   ```bash
   ssh root@ip_de_votre_serveur
   ```
2. Installez Docker et Docker Compose :
   ```bash
   apt update && apt install -y docker.io docker-compose git
   ```
3. Clonez votre projet et entrez dans le dossier :
   ```bash
   git clone <url_de_votre_repo> ascos
   cd ascos/ascos-backend
   ```
4. Lancez le serveur en conteneur sécurisé :
   ```bash
   docker-compose up -d --build
   ```
5. Votre backend tourne immédiatement en arrière-plan sur le port 3000 avec redémarrage automatique en cas de panne !

---

## Comment connecter l'application mobile au serveur en ligne ?

Une fois votre serveur en ligne (ex: `https://ascos-backend.onrender.com`) :

Ouvrez le fichier [api_service.dart](file:///d:/projets/A.S.C.O.S/ascos_mobile/lib/services/api_service.dart) dans l'application mobile et renseignez l'URL dans `_candidateBases` :
```dart
static final List<String> _candidateBases = [
  'https://ascos-backend.onrender.com/api', // <-- Votre URL en ligne ici
  'http://192.168.1.70:3000/api',
  'http://127.0.0.1:3000/api',
  'http://10.0.2.2:3000/api',
];
```
L'application testera et se connectera automatiquement à votre serveur en ligne partout où vous vous trouvez (en 4G/5G, Wi-Fi ou au bord du bassin) !
