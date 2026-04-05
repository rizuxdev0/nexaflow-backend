# Étape 1 : Construction de l'API
FROM node:20-alpine AS build

WORKDIR /app

# Copie des fichiers de configuration pour la gestion des dépendances
COPY package*.json ./

# Installation de toutes les dépendances (y compris de développement pour le build)
RUN npm install

# Copie du reste des fichiers source de l'API
COPY . .

# Construction de l'API NestJS
RUN npm run build

# Étape 2 : Exécution de l'API (Image légère)
FROM node:20-alpine

WORKDIR /app

# Définition des variables d'environnement par défaut
ENV NODE_ENV=production

# Copie uniquement des fichiers nécessaires à l'exécution de la production
COPY --from=build /app/package*.json ./
COPY --from=build /app/dist ./dist

# Installation uniquement des dépendances de production pour réduire la taille de l'image
RUN npm install --only=production

# Exposition du port par défaut de l'API (conformément à la config .env)
EXPOSE 3003

# Commande par défaut pour lancer l'API
CMD ["node", "dist/main"]
