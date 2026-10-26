# --- Étape 1 : build ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Génère le Prisma Client ET compile TypeScript
# URL factice pour le build (prisma generate ne se connecte pas réellement)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate
RUN npm run build

# --- Étape 2 : image finale (allégée) ---
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 4003

CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/src/server.js"]
