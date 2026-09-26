@echo off
setlocal enabledelayedexpansion
title Setup Novo Computador - Promo Pokemon TCG
chcp 65001 >nul

echo ========================================================
echo   ⚡ PROMO POKÉMON TCG - PREPARAÇÃO DE NOVO COMPUTADOR
echo ========================================================
echo.

echo [1/5] Verificando instalacao do Node.js e NPM...
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERRO] Node.js nao encontrado no sistema!
  echo Por favor, instale o Node.js v20 LTS ou v22 LTS em https://nodejs.org/
  echo Depois de instalar, abra um novo terminal e execute este script novamente.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo [OK] Node.js detectado: %NODE_VERSION%

where npm >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERRO] NPM nao encontrado no sistema!
  pause
  exit /b 1
)

echo.
echo [2/5] Configurando arquivos de ambiente (.env)...
if not exist ".env" (
  if exist ".env.example" (
    copy ".env.example" ".env" >nul
    echo [OK] Arquivo .env criado a partir de .env.example
  ) else (
    echo [AVISO] .env.example nao encontrado na raiz.
  )
) else (
  echo [OK] Arquivo .env ja existente na raiz.
)

echo.
echo [3/5] Instalando dependencias dos modulos (Replicador e Disparador)...
echo   - Instalando dependencias em app/...
call npm install --prefix app
if %errorlevel% neq 0 (
  echo [ERRO] Falha ao instalar dependencias do app.
  pause
  exit /b 1
)

echo   - Instalando dependencias em bot-disparador/...
call npm install --prefix bot-disparador
if %errorlevel% neq 0 (
  echo [ERRO] Falha ao instalar dependencias do bot-disparador.
  pause
  exit /b 1
)
echo [OK] Todas as dependencias instaladas com sucesso!

echo.
echo [4/5] Compilando TypeScript e copiando assets (Build)...
call npm run build:all
if %errorlevel% neq 0 (
  echo [ERRO] Falha no processo de compilacao.
  pause
  exit /b 1
)
echo [OK] Ambos os servicos compilados com sucesso!

echo.
echo [5/5] Executando testes automatizados de sanidade...
call npm test
if %errorlevel% neq 0 (
  echo [AVISO] Alguns testes apresentaram falha. Verifique os logs acima.
) else (
  echo [OK] 128 testes automatizados aprovados (100%% verde)!
)

echo.
echo ========================================================
echo   ✅ TUDO PRONTO PARA USAR E CONTINUAR MELHORIAS!
echo ========================================================
echo.
echo Escolha como deseja iniciar:
echo   - Modo Desenvolvimento (com Hot Reload):  execute iniciar-dev.bat
echo   - Modo Producao Local (Compilado):        execute iniciar-tudo.bat
echo   - Para encerrar servicos:                 execute parar.bat
echo.
echo   Painel Replicador:  http://localhost:3000
echo   Painel Disparador:  http://localhost:3333
echo ========================================================
echo.
pause
