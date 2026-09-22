FROM node:22-slim

WORKDIR /app

# Instalar ferramentas de compilação para better-sqlite3 e curl para healthcheck
RUN apt-get update && apt-get install -y python3 make g++ curl && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de dependências
COPY app/package*.json ./

# Instalar todas as dependências (compila better-sqlite3 nativamente)
RUN npm ci

# Copiar tsconfig, scripts e código fonte
COPY app/tsconfig.json ./
COPY app/src ./src
COPY app/scripts ./scripts

# Compilar TypeScript e copiar assets estáticos
RUN npm run build

# Remover dependências de desenvolvimento para deixar a imagem leve
RUN npm prune --omit=dev && npm cache clean --force

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data

RUN mkdir -p /app/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
