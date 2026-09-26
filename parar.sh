#!/usr/bin/env bash

echo "========================================================"
echo "  ⚡ ENCERRANDO SERVIDORES PROMO POKÉMON TCG"
echo "========================================================"
echo ""

echo "[1/2] Finalizando porta 3000 (Replicador)..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "[2/2] Finalizando porta 3333 (Disparador)..."
lsof -ti:3333 | xargs kill -9 2>/dev/null || true

echo ""
echo "[OK] Todos os servidores foram encerrados!"
