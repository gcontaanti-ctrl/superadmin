@echo off
setlocal EnableDelayedExpansion
color 0B
chcp 65001 >nul 2>&1
title Gerador do Instalador do Servidor Cybertech

echo ========================================================
echo     EXPORTADOR DO INSTALADOR COMPLETO DE SERVIDOR
echo ========================================================
echo.

echo [1/3] Compilando a versao mais recente do frontend (npm run build)...
call npm run build
if %errorLevel% NEQ 0 (
    echo.
    echo [AVISO] O build gerou um alerta ou erro. Verifique se o dist/client esta valido.
)

echo.
echo [2/3] Preparando pacote completo do servidor...
set TEMP_DIR=%TEMP%\CybertechPacote
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

:: 1. Frontend compilado
xcopy /E /Y /I /Q "dist" "%TEMP_DIR%\dist\" >nul 2>&1

:: 2. Backend e modulos
xcopy /E /Y /I /Q "backend" "%TEMP_DIR%\backend\" >nul 2>&1
copy /Y "backend_api.cjs" "%TEMP_DIR%\" >nul 2>&1
copy /Y "utils_text_cleaner.cjs" "%TEMP_DIR%\" >nul 2>&1

:: 3. Servicos Windows e dependencias
copy /Y "install-service.js" "%TEMP_DIR%\" >nul 2>&1
copy /Y "uninstall-service.js" "%TEMP_DIR%\" >nul 2>&1
copy /Y "package.json" "%TEMP_DIR%\" >nul 2>&1

:: 4. Configuracoes e banco de dados (MODELOS LIMPOS - SEM DADOS DO ALBUQUERQUE)
copy /Y "cliente-config.template.env" "%TEMP_DIR%\cliente-config.env" >nul 2>&1
copy /Y "cliente-config.template.env" "%TEMP_DIR%\" >nul 2>&1
copy /Y "campanhas.template.json" "%TEMP_DIR%\campanhas.json" >nul 2>&1
copy /Y "campanhas.template.json" "%TEMP_DIR%\" >nul 2>&1
copy /Y "mobile_users.template.json" "%TEMP_DIR%\mobile_users.json" >nul 2>&1
copy /Y "mobile_users.template.json" "%TEMP_DIR%\" >nul 2>&1
echo [] > "%TEMP_DIR%\metas_data.json"

:: 5. Pasta Public (App Mobile e Simulador)
if exist "public" (
    mkdir "%TEMP_DIR%\public" >nul 2>&1
    xcopy /E /Y /I /Q "public" "%TEMP_DIR%\public\" >nul 2>&1
)

copy /Y "Configurar_DataCISS.bat" "%TEMP_DIR%\" >nul 2>&1
copy /Y "setup-dataciss.js" "%TEMP_DIR%\" >nul 2>&1
copy /Y "INSTALAR_SERVIDOR_REDE.bat" "%TEMP_DIR%\" >nul 2>&1
copy /Y "Instalar.bat" "%TEMP_DIR%\" >nul 2>&1
copy /Y "Ver_IP_e_Links_de_Acesso.bat" "%TEMP_DIR%\" >nul 2>&1
copy /Y "Configurar_Dominio_Local.bat" "%TEMP_DIR%\" >nul 2>&1
copy /Y "Instalar-Simulador-Smartphone.bat" "%TEMP_DIR%\" >nul 2>&1
copy /Y "Desinstalar_Servidor_Desta_Maquina.bat" "%TEMP_DIR%\" >nul 2>&1
copy /Y "2-Atualizar_Sistema.bat" "%TEMP_DIR%\" >nul 2>&1

echo.
echo [3/3] Compactando arquivo ZIP na sua Area de Trabalho...
set ZIP_FILE=%USERPROFILE%\Desktop\Instalador_Servidor_Completo.zip
if exist "%ZIP_FILE%" del /f /q "%ZIP_FILE%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath '%ZIP_FILE%' -Force"

:: Limpeza
rmdir /s /q "%TEMP_DIR%"

echo.
color 0A
echo ========================================================
echo        PACOTE GERADO COM SUCESSO!
echo ========================================================
echo.
echo  Arquivo gerado na sua Area de Trabalho:
echo    -> Instalador_Servidor_Completo.zip
echo.
echo  COMO MIGRAR PARA O NOVO COMPUTADOR:
echo  1. Copie o arquivo 'Instalador_Servidor_Completo.zip' para um
echo     pendrive ou envie para a nova maquina.
echo  2. Na nova maquina, extraia a pasta ZIP.
echo  3. Clique com o botao direito em 'INSTALAR_SERVIDOR_REDE.bat'
echo     e escolha 'Executar como Administrador'.
echo  4. O instalador configurara o servico, abrira o firewall
echo     e mostrara na tela o IP de acesso para toda a empresa!
echo.
echo  (Opcional: Nesta maquina atual, execute o arquivo
echo  'Desinstalar_Servidor_Desta_Maquina.bat' para desativar o servidor antigo).
echo ========================================================
echo.
pause
