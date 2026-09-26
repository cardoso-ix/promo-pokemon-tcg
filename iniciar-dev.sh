#!/usr/bin/env bash

echo "========================================================"
echo "  ⚡ MODO DESENVOLVIMENTO - PROMO POKÉMON TCG"
echo "  - Replicador de Ofertas (Porta 3000)"
echo "  - Bot Disparador com IA  (Porta 3333)"
echo "========================================================"
echo ""
echo "Iniciando em segundo plano..."
(cd app && npm run dev) &
PID_APP=$!

(cd bot-disparador && npm run dev) &
PID_BOT=$!

echo "[OK] Servidores iniciados!"
echo "  PID Replicador: $PID_APP (http://localhost:3000)"
echo "  PID Disparador: $PID_BOT (http://localhost:3333)"
echo ""
echo "Pressione Ctrl+C para encerrar ambos os servidores."

trap "kill $PID_APP $PID_BOT 2>/dev/null; exit 0" INT TERM
wait
