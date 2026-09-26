@echo off
title Iniciar Servidores em Modo Desenvolvimento (Hot Reload)
chcp 65001 >nul

echo ========================================================
echo   PROMO POKEMON TCG - MODO DESENVOLVIMENTO
echo   - Replicador de Ofertas (Porta 3000)
echo   - Bot Disparador com IA  (Porta 3333)
echo ========================================================
echo.

start "Promo Replica [DEV :3000]" cmd /k "cd /d %~dp0app && npm run dev"
start "Bot Disparador [DEV :3333]" cmd /k "cd /d %~dp0bot-disparador && npm run dev"

echo.
echo [OK] Servidores em modo desenvolvimento iniciados em janelas separadas!
echo   Qualquer alteracao em src/ recarregara o servidor automaticamente.
echo.
echo   - Super Cockpit Unificado: http://localhost:3000
echo   - Modulo Replicador:      http://localhost:3000
echo   - Modulo Disparador e IA: http://localhost:3333
echo.
echo Para encerrar os servidores, feche as janelas ou execute parar.bat.
echo.
ping 127.0.0.1 -n 3 >nul
