FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY app/package*.json ./
RUN npm ci

COPY app/tsconfig.json ./
COPY app/src ./src
COPY app/scripts ./scripts
RUN npm run build

FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY app/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/data

EXPOSE 3000
VOLUME ["/app/data"]

CMD ["node", "dist/index.js"]
