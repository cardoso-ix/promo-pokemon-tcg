FROM node:22-slim

WORKDIR /app

# Instalar ferramentas de compilação para better-sqlite3 e curl para healthcheck
RUN apt-get update && apt-get install -y python3 make g++ curl && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de dependências e scripts de apoio
COPY package*.json ./
COPY scripts ./scripts

# Instalar todas as dependências (compila better-sqlite3 nativamente)
RUN npm ci

# Copiar tsconfig e código fonte
COPY tsconfig.json ./
COPY src ./src

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
EXPOSE 3333

CMD ["npm", "start"]
