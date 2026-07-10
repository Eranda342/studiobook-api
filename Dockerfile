FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma/ prisma/
COPY prisma.config.ts .
COPY nest-cli.json .
COPY tsconfig.json .
COPY tsconfig.build.json .
COPY src/ src/

RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/studiobook_db?schema=public" npx prisma generate
RUN npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package.json package-lock.json ./
COPY prisma/ prisma/
COPY prisma.config.ts .

RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

RUN chown -R node:node /app

EXPOSE 3000

USER node

CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && node dist/main"]
