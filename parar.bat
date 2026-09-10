@echo off
echo ========================================================
echo   Encerrando Promo Replica na porta 3000...
echo ========================================================
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a
)
echo Pronto! Servidor finalizado.
timeout /t 3
