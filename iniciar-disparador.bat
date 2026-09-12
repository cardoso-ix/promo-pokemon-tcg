@echo off
title Bot Disparador e IA DeepSeek - WhatsApp
echo ========================================================
echo   Iniciando Bot Disparador e Atendimento com DeepSeek
echo   Painel Web: http://localhost:3333
echo ========================================================
cd /d "%~dp0bot-disparador"
node dist/index.js
pause
