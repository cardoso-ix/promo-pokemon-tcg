@echo off
title Iniciar Servidores em Modo Desenvolvimento (Hot Reload)
chcp 65001 >nul

echo ========================================================
echo   ⚡ MODO DESENVOLVIMENTO - PROMO POKÉMON TCG
echo   - Replicador de Ofertas (Porta 3000) com Hot Reload
echo   - Bot Disparador com IA  (Porta 3333) com Hot Reload
echo ========================================================
echo.

start "Promo Replica [DEV :3000]" cmd /k "cd /d %~dp0app && npm run dev"
start "Bot Disparador [DEV :3333]" cmd /k "cd /d %~dp0bot-disparador && npm run dev"

echo.
echo [OK] Servidores em modo desenvolvimento iniciados em janelas separadas!
echo   Qualquer alteracao em src/ recarregara o servidor automaticamente.
echo.
echo   - ⚡ Super Cockpit Unificado: http://localhost:3000 (Tudo em 1 só lugar!)
echo   - 💧 Módulo Replicador:      http://localhost:3000
echo   - 🔥 Módulo Disparador & IA: http://localhost:3333 (ou via Cockpit Unificado)
echo.
echo Para encerrar os servidores, feche as janelas ou execute parar.bat.
echo.
timeout /t 5 >nul
