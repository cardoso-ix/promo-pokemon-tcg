@echo off
title Promo Replica - Servidor de Promocoes
echo ========================================================
echo   Iniciando Promo Replica Pokemon TCG
echo   Painel Web: http://localhost:3000
echo ========================================================
cd /d "%~dp0app"
node dist/index.js
pause
