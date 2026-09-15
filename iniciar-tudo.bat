@echo off
title Iniciar Todos os Servidores
echo ========================================================
echo   Iniciando Promo Replica (Porta 3000)
echo   Iniciando Bot Disparador (Porta 3333)
echo ========================================================
start "Promo Replica - Porta 3000" cmd /k "cd /d %~dp0app && node dist/index.js"
start "Bot Disparador - Porta 3333" cmd /k "cd /d %~dp0bot-disparador && node dist/index.js"
echo.
echo [OK] Servidores iniciados em janelas dedicadas!
echo   - Promo Replica:    http://localhost:3000
echo   - Bot Disparador:   http://localhost:3333
echo.
timeout /t 4 >nul
