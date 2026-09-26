#!/usr/bin/env bash
set -e

echo "========================================================"
echo "  ⚡ PROMO POKÉMON TCG - PREPARAÇÃO DE NOVO COMPUTADOR"
echo "========================================================"
echo ""

echo "[1/5] Verificando instalacao do Node.js e NPM..."
if ! command -v node >/dev/null 2>&1; then
  echo "[ERRO] Node.js nao encontrado no sistema!"
  echo "Por favor instale o Node.js v20 LTS ou v22 LTS (https://nodejs.org/)."
  exit 1
fi

echo "[OK] Node.js detectado: $(node -v)"

if ! command -v npm >/dev/null 2>&1; then
  echo "[ERRO] NPM nao encontrado no sistema!"
  exit 1
fi

echo ""
echo "[2/5] Configurando arquivos de ambiente (.env)..."
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
  echo "[OK] Arquivo .env criado a partir de .env.example"
else
  echo "[OK] Arquivo .env ja existente na raiz."
fi

echo ""
echo "[3/5] Instalando dependencias dos modulos..."
echo "  - Instalando dependencias em app/..."
npm install --prefix app
echo "  - Instalando dependencias em bot-disparador/..."
npm install --prefix bot-disparador
echo "[OK] Todas as dependencias instaladas com sucesso!"

echo ""
echo "[4/5] Compilando TypeScript e copiando assets (Build)..."
npm run build:all
echo "[OK] Ambos os servicos compilados com sucesso!"

echo ""
echo "[5/5] Executando testes automatizados de sanidade..."
npm test
echo "[OK] Testes automatizados executados com sucesso!"

echo ""
echo "========================================================"
echo "  ✅ TUDO PRONTO PARA USAR E CONTINUAR MELHORIAS!"
echo "========================================================"
echo ""
echo "Comandos rapidos:"
echo "  - Modo Dev (Hot Reload): npm run dev:app  e  npm run dev:bot"
echo "  - Replicador Web:       http://localhost:3000"
echo "  - Bot Disparador Web:   http://localhost:3333"
echo "========================================================"
