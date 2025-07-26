# Le Dino à Lau 🦕

[Live app](https://p5n-dinosaur.web.app/)

Une application web de compagnon dinosaure virtuel alimentée par l'IA, conçue comme un cadeau d'anniversaire spécial. Cette application offre une expérience interactive et joyeuse avec votre dinosaure personnel qui vit sa propre vie et évolue selon vos interactions.

![Dino App](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)

## ✨ Fonctionnalités

### 🦖 Dinosaure Virtuel Persistant
- Un dinosaure unique et persistant qui évolue avec le temps
- Activités générées par l'IA basées sur la personnalité et l'humeur
- Images uniques générées pour chaque activité
- Pas de pénalités pour négligence - seulement des interactions positives!

### 🎨 Contenu Généré par l'IA
- **Activités Ambiantes**: Nouvelles activités générées automatiquement
- **Images Cohérentes**: Utilisation d'images de référence pour maintenir l'apparence
- **Descriptions Créatives**: Textes générés par GPT-4 pour chaque activité
- **Contextualisation**: Activités appropriées selon l'heure et la saison
- **🌤️ Météo Intelligente**: Réactions contextuelles aux conditions météo locales

### 🎮 Interactions Utilisateur
- **Nourrir**: Donnez à manger à votre dinosaure
- **Jouer**: Engagez-vous dans des activités ludiques
- **Autres**: Interactions personnalisées et créatives
- **Saisie Libre**: Tapez n'importe quoi pour des interactions ouvertes

### 🌤️ Intégration Météo Intelligente
- **Géolocalisation**: Demande automatique de la position de l'utilisateur
- **Météo Locale**: Intégration avec OpenWeatherMap pour les conditions actuelles
- **Réactions Contextuelles**: Charlie réagit aux conditions météo notables
- **Fallback Montréal**: Utilise la météo de Montréal si la géolocalisation est refusée
- **IA Invisible**: Météo normale reste discrète, seules les conditions extrêmes influencent les activités

### 📱 Interface Moderne
- Design réactif et moderne avec animations fluides
- Interface utilisateur intuitive en français canadien
- Authentification Google et anonyme
- Journal d'activités avec historique complet

## 🛠️ Stack Technique

### Frontend
- **React 19** avec hooks modernes
- **TypeScript** pour la sécurité des types
- **Vite** pour un développement rapide
- **CSS personnalisé** avec gradients et animations

### Backend
- **Firebase Firestore** pour la base de données NoSQL
- **Firebase Functions** pour la logique serverless
- **Firebase Authentication** pour la gestion des utilisateurs
- **Firebase Storage** pour les images générées
- **OpenWeatherMap API** pour les données météorologiques en temps réel
- **Firebase Hosting** pour le déploiement

### Intelligence Artificielle
- **OpenAI GPT-4** pour la génération de texte
- **OpenAI Image Generation** pour créer des images uniques
- **Images de référence** pour maintenir la cohérence visuelle

## Installation et Configuration

### Prérequis
- Node.js 18+
- npm ou yarn
- Firebase CLI
- Compte OpenAI avec clé API
- Compte OpenWeatherMap avec clé API (gratuit)

### Installation

1. **Cloner le dépôt**
   ```bash
   git clone <repository-url>
   cd dinosaur
   ```

2. **Installer les dépendances**
   ```bash
   # Dépendances principales
   npm install

   # Dépendances des Functions
   cd functions
   npm install
   cd ..
   ```

3. **Configuration Firebase**
   ```bash
   # Connexion à Firebase
   firebase login

   # Initialiser le projet (si nécessaire)
   firebase init
   ```

4. **Variables d'environnement**
   ```bash
   # Configurer la clé API OpenAI
   firebase functions:secrets:set OPENAI_API_KEY
   
   # Configurer la clé API OpenWeatherMap
   firebase functions:secrets:set OPENWEATHER_API_KEY
   ```
   
   **Obtenir les clés API :**
   - **OpenAI** : [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - **OpenWeatherMap** : [https://openweathermap.org/api](https://openweathermap.org/api) (gratuit jusqu'à 1000 appels/jour)

5. **Images de référence**
   - Placer les images de référence du dinosaure dans `functions/src/reference-images/`
   - Formats supportés: PNG, JPEG, WebP

### Démarrage du développement

Ouvrez **3 terminaux** et exécutez les commandes suivantes :

**Terminal 1 - Frontend (React + Vite)**
```bash
npm run dev
```

**Terminal 2 - Émulateurs Firebase**
```bash
firebase emulators:start
```

**Terminal 3 - Functions (Build en mode watch)**
```bash
cd functions
npm run build:watch
```

### URLs de développement
- **App Frontend**: http://localhost:5173
- **Firebase UI**: http://localhost:4000
- **Firestore**: http://localhost:8080
- **Functions**: http://localhost:5001

## 📁 Structure du Projet

```
dinosaur/
├── public/                 # Fichiers statiques
├── src/                    # Code source React
│   ├── App.tsx            # Composant principal
│   ├── App.css            # Styles principaux
│   ├── firebase.ts        # Configuration Firebase
│   └── ...
├── functions/              # Firebase Functions
│   ├── src/
│   │   ├── index.ts       # Fonction principale
│   │   ├── promptUtils.ts # Utilitaires pour prompts
│   │   └── reference-images/ # Images de référence
│   └── ...
├── firebase.json          # Configuration Firebase
├── firestore.rules        # Règles Firestore
├── storage.rules          # Règles Storage
└── README.md
```

## 🔧 Scripts Disponibles

### Projet Principal
```bash
npm run dev      # Démarrage en mode développement
npm run build    # Construction pour production
npm run preview  # Prévisualisation de la build
npm run lint     # Vérification du code
```

### Functions
```bash
cd functions
npm run build        # Construction des functions
npm run build:watch  # Construction en mode watch
npm run serve        # Serveur local avec émulateur
npm run deploy       # Déploiement des functions
```

## 🗄️ Base de Données

### Structure Firestore
```
/users/{userId}/
├── dino/
│   ├── name: "Dino"
│   ├── lastActivityTimestamp: Timestamp
│   └── mood: "Playful"
└── activities/
    └── {activityId}/
        ├── description: "Description de l'activité"
        ├── imageUrl: "URL de l'image"
        ├── timestamp: Timestamp
        └── interactionType: "ambient" | "interactive"
```

## 🔐 Sécurité

### Variables Secrètes
- `OPENAI_API_KEY`: Clé API OpenAI stockée dans Firebase Functions

### Règles de Sécurité
- **Firestore**: Accès restreint aux données de l'utilisateur connecté
- **Storage**: Lectures publiques, écritures authentifiées
- **Functions**: Authentification requise pour les fonctions sensibles

## 🚀 Déploiement

### Déploiement complet
```bash
# Construction et déploiement
npm run build
firebase deploy
```

### Déploiement par parties
```bash
# Seulement les functions
firebase deploy --only functions

# Seulement l'hosting
firebase deploy --only hosting

# Seulement les règles
firebase deploy --only firestore:rules,storage:rules
```

## 🎨 Personnalisation

### Modifier l'apparence du dinosaure
1. Remplacer les images dans `functions/src/reference-images/`
2. Ajuster les prompts dans `functions/src/promptUtils.ts`
3. Redéployer les functions

### Ajouter de nouvelles interactions
1. Modifier `InteractionRequestData` dans `src/App.tsx`
2. Ajouter les boutons dans l'interface
3. Mettre à jour la logique dans `functions/src/index.ts`

## 🔮 Améliorations Futures

- **Système de Collections**: Objets trouvés par le dinosaure
- **Mémoire**: Référence aux interactions passées
- **Personnalisation**: Choix de couleurs et accessoires
- **PWA**: Support hors ligne et installation
- **Traits de Personnalité**: Évolution basée sur les interactions

## 📜 Licence

Ce projet est un cadeau personnel et n'est pas destiné à un usage commercial.

## 🎁 Contexte

Cette application a été créée comme cadeau d'anniversaire spécial pour quelqu'un qui adore les dinosaures. Elle vise à être une source de joie sans stress, où le dinosaure vit sa propre vie et où chaque interaction ne fait que renforcer le lien avec son propriétaire.

---

*Fait avec ❤️ et beaucoup de café ☕*
