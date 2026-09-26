@echo off
title Encerrar Servidores Promo Pokemon TCG
chcp 65001 >nul

echo ========================================================
echo   ⚡ ENCERRANDO SERVIDORES PROMO POKÉMON TCG
echo ========================================================
echo.

echo [1/2] Verificando e finalizando processos na porta 3000 (Replicador)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>nul
  echo   - Processo PID %%a encerrado na porta 3000.
)

echo [2/2] Verificando e finalizando processos na porta 3333 (Disparador)...
for /f "tokens=5" %%b in ('netstat -aon ^| findstr ":3333" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%b >nul 2>nul
  echo   - Processo PID %%b encerrado na porta 3333.
)

echo.
echo [OK] Todos os servidores foram finalizados com sucesso!
timeout /t 3 >nul
