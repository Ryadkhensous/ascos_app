# ==============================================================================
# Dockerfile Production Multi-Stage pour ASCOS Backend (Node.js + TypeScript)
# Optimisé pour Render, Railway, Fly.io, OVH, Hetzner ou Docker Compose
# ==============================================================================

# --- Étape 1 : Build TypeScript ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copie des définitions de dépendances
COPY package*.json ./
COPY tsconfig.json ./

# Installation complète des dépendances (y compris devDependencies pour tsc)
RUN npm ci

# Copie du code source
COPY src/ ./src/

# Compilation TypeScript vers dist/
RUN npm run build

# --- Étape 2 : Image Production finale ultra-légère (< 130 Mo) ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Création d'un utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 ascos

# Copie uniquement des fichiers nécessaires
COPY package*.json ./

# Installation stricte des dépendances de production
RUN npm ci --only=production && npm cache clean --force

# Copie du code compilé depuis l'étape de build
COPY --from=builder /app/dist ./dist

# Attribution des droits à l'utilisateur ascos
RUN chown -R ascos:nodejs /app

USER ascos

# Port d'écoute par défaut
EXPOSE 3000

# Vérification de santé du conteneur (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

# Commande de démarrage
CMD ["node", "dist/server.js"]
