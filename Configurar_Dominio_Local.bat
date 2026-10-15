@echo off
setlocal EnableDelayedExpansion
color 0B
chcp 65001 >nul 2>&1
title SmartCybertech Gestao - Configurar Nome Local (smartcybertech)

echo.
echo  ============================================================
echo       SMARTCYBERTECH GESTAO - CONFIGURAR NOME LOCAL
echo  ============================================================
echo.
echo  Este script adiciona o endereco "smartcybertech" nesta
echo  maquina, permitindo acessar o sistema e o app pelo nome ao
echo  inves de digitar o IP ou "localhost".
echo.
echo  ACESSO APOS CONFIGURACAO:
echo     Painel:     http://smartcybertech:3001
echo     App Mobile: http://smartcybertech:8082
echo.
echo  ============================================================
echo.

:: 1. VERIFICA PERMISSOES DE ADMINISTRADOR
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    color 0C
    echo  [ERRO] Precisa de ADMINISTRADOR para editar o arquivo hosts!
    echo.
    echo  Clique com o botao direito neste arquivo e escolha:
    echo  "Executar como Administrador"
    echo.
    pause
    exit /b
)

set HOSTS_FILE=%SystemRoot%\System32\drivers\etc\hosts
set DOMAIN_NAME=smartcybertech
set PORTA=3001

:: 2. DETECTA O IP LOCAL DO SERVIDOR
echo  [1/3] Detectando IP local do servidor...
for /f "tokens=*" %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' -and $_.InterfaceAlias -notlike '*Loopback*' } | Select-Object -First 1 -ExpandProperty IPAddress"') do set IP_SERVIDOR=%%i

if "!IP_SERVIDOR!"=="" set IP_SERVIDOR=127.0.0.1
echo  [OK] IP do servidor detectado: !IP_SERVIDOR!

:: 3. REMOVE ENTRADAS ANTIGAS DO DOMINIO (se houver)
echo.
echo  [2/3] Removendo entradas antigas de %DOMAIN_NAME%...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$content = Get-Content '%HOSTS_FILE%' -Encoding UTF8 -ErrorAction SilentlyContinue;" ^
  "$filtered = $content | Where-Object { $_ -notmatch '%DOMAIN_NAME%' };" ^
  "Set-Content '%HOSTS_FILE%' $filtered -Encoding UTF8"
echo  [OK] Limpeza feita.

:: 4. ADICIONA NOVAS ENTRADAS NO ARQUIVO HOSTS
echo.
echo  [3/3] Registrando "%DOMAIN_NAME%" no arquivo hosts...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$entry1 = '127.0.0.1       %DOMAIN_NAME%';" ^
  "$entry2 = '!IP_SERVIDOR!   %DOMAIN_NAME%';" ^
  "$hosts = '%HOSTS_FILE%';" ^
  "Add-Content $hosts '';" ^
  "Add-Content $hosts '# --- Cybertech Gestao - Dominio Local ---';" ^
  "Add-Content $hosts $entry1;" ^
  "Add-Content $hosts $entry2;" ^
  "Add-Content $hosts '# ----------------------------------------';"

echo  [OK] Dominio local registrado!

:: 5. SALVA IP EM ARQUIVO PARA USO DOS CLIENTES DE REDE
echo.
echo  [+] Salvando configuracoes para clientes de rede...
echo IP_SERVIDOR=!IP_SERVIDOR! > "%~dp0.runtime\servidor_ip.txt"
echo DOMAIN_NAME=%DOMAIN_NAME% >> "%~dp0.runtime\servidor_ip.txt"
echo PORTA=%PORTA% >> "%~dp0.runtime\servidor_ip.txt"

:: Garante que a pasta .runtime existe
if not exist "%~dp0.runtime" mkdir "%~dp0.runtime"
echo IP_SERVIDOR=!IP_SERVIDOR!> "%~dp0.runtime\servidor_ip.txt"
echo DOMAIN_NAME=%DOMAIN_NAME%>> "%~dp0.runtime\servidor_ip.txt"
echo PORTA=%PORTA%>> "%~dp0.runtime\servidor_ip.txt"

:: 6. GERA SCRIPT DE CONFIGURACAO PARA OS CLIENTES DE REDE
echo  [+] Gerando script para instalar em maquinas clientes...

set SCRIPT_CLIENTE=%~dp0Configurar_Cliente_Rede.bat

(
echo @echo off
echo setlocal EnableDelayedExpansion
echo color 0B
echo chcp 65001 ^>nul 2^>^&1
echo title Cybertech Gestao - Configurar Acesso na Rede
echo.
echo echo.
echo echo  ============================================================
echo echo       CYBERTECH GESTAO - CONFIGURAR ACESSO NA REDE
echo echo  ============================================================
echo echo.
echo echo  Este script permite acessar o sistema pelo nome:
echo echo     http://%DOMAIN_NAME%:%PORTA%
echo echo.
echo echo  Ao inves de digitar o IP do servidor manualmente.
echo echo  ============================================================
echo echo.
echo.
echo net session ^>nul 2^>^&1
echo if %%errorLevel%% NEQ 0 ^(
echo     color 0C
echo     echo  [ERRO] Precisa de ADMINISTRADOR para editar o arquivo hosts!
echo     echo.
echo     echo  Clique com o botao direito e escolha: Executar como Administrador
echo     echo.
echo     pause
echo     exit /b
echo ^)
echo.
echo set HOSTS_FILE=%%SystemRoot%%\System32\drivers\etc\hosts
echo.
echo echo  [1/2] Removendo configuracao anterior...
echo powershell -NoProfile -ExecutionPolicy Bypass -Command "$content = Get-Content '%%HOSTS_FILE%%' -Encoding UTF8 -ErrorAction SilentlyContinue; $filtered = $content ^| Where-Object { $_ -notmatch '%DOMAIN_NAME%' }; Set-Content '%%HOSTS_FILE%%' $filtered -Encoding UTF8"
echo echo  [OK] Limpeza feita.
echo.
echo echo  [2/2] Adicionando acesso ao servidor...
echo powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Content '%%HOSTS_FILE%%' ''; Add-Content '%%HOSTS_FILE%%' '# --- Cybertech Gestao ---'; Add-Content '%%HOSTS_FILE%%' '!IP_SERVIDOR!   %DOMAIN_NAME%'; Add-Content '%%HOSTS_FILE%%' '# ------------------------';"
echo.
echo echo.
echo color 0A
echo echo  ============================================================
echo echo       CONFIGURACAO CONCLUIDA COM SUCESSO!
echo echo  ============================================================
echo echo.
echo echo  Agora abra o navegador e acesse:
echo echo.
echo echo      http://%DOMAIN_NAME%:%PORTA%
echo echo.
echo echo  ============================================================
echo echo.
echo pause
echo start http://%DOMAIN_NAME%:%PORTA%
) > "%SCRIPT_CLIENTE%"

echo  [OK] Script "Configurar_Cliente_Rede.bat" gerado.

:: 7. MOSTRA RESULTADO FINAL
echo.
color 0A
echo  ============================================================
echo       DOMINIO LOCAL CONFIGURADO COM SUCESSO!
echo  ============================================================
echo.
echo  NESTE COMPUTADOR (SERVIDOR), acesse pelo navegador:
echo     http://%DOMAIN_NAME%:%PORTA%
echo.
echo  PARA OUTROS COMPUTADORES E CELULARES NA REDE:
echo     Copie e execute o arquivo:
echo     >> Configurar_Cliente_Rede.bat <<
echo     em cada maquina que precisar acessar o sistema.
echo.
echo  Ou informe o IP direto para celulares e tablets:
echo     http://!IP_SERVIDOR!:%PORTA%
echo.
echo  ============================================================
echo.
echo Pressione qualquer tecla para abrir o sistema agora...
pause >nul

start http://%DOMAIN_NAME%:%PORTA%
