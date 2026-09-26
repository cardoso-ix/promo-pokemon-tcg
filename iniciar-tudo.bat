@echo off
title Iniciar Todos os Servidores (Modo Producao Local)
chcp 65001 >nul

echo ========================================================
echo   ⚡ PROMO POKÉMON TCG - INICIALIZANDO SERVIÇOS
echo   - Replicador de Ofertas (Porta 3000)
echo   - Bot Disparador com IA  (Porta 3333)
echo ========================================================
echo.

rem Verificar se o build existe, se não, compilar automaticamente
if not exist "%~dp0app\dist\index.js" (
  echo [INFO] Build do Replicador nao encontrado. Compilando automaticamente...
  call npm run build:app
)

if not exist "%~dp0bot-disparador\dist\index.js" (
  echo [INFO] Build do Bot Disparador nao encontrado. Compilando automaticamente...
  call npm run build:bot
)

echo Iniciando instancias compiladas em janelas dedicadas...
start "Promo Replica - Porta 3000" cmd /k "cd /d %~dp0app && node dist/index.js"
start "Bot Disparador - Porta 3333" cmd /k "cd /d %~dp0bot-disparador && node dist/index.js"

echo.
echo [OK] Servidores iniciados com sucesso!
echo   - Promo Replica:    http://localhost:3000
echo   - Bot Disparador:   http://localhost:3333
echo.
echo Para desenvolvimento com Hot Reload, utilize iniciar-dev.bat.
echo Para finalizar os servidores, execute parar.bat.
echo.
timeout /t 4 >nul
