FROM node:22-slim AS builder

WORKDIR /app

# Instalar dependências necessárias para compilação nativa se preciso
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

# Imagem final enxuta
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Criar diretório de dados para volume persistente
RUN mkdir -p /app/data

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["node", "dist/index.js"]
