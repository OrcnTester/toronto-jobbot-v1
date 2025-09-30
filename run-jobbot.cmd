@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM === ENV sabitleri ===
set "GOOGLE_APPLICATION_CREDENTIALS=C:********************\svc.json"
set "SHEET_ID=**************************************"
set "SHEET_TAB=Jobs"
set "APPLICANT_NAME=Orçun Yörük"
set "LINKEDIN_URL=https://www.linkedin.com/in/orcun-yoruk-355b52147"
set "GITHUB_URL=https://github.com/OrcnTester"
set "FOLLOWUP_DAYS=7"
set "SEARCH_ONLY=true"
REM === MAIL ENV ===
set "MAIL_FROM=orcnyoruk@gmail.com"
set "MAIL_TO=orcnyoruk@gmail.com"
set "MAIL_BCC=orcnyoruk@gmail.com"
set "MAIL_PASS=-********************"


REM === Proje kökü ===
set "PROJ=C:\toronto-jobbot-v1"
if not exist "%PROJ%" (
  echo [launcher] Project folder NOT FOUND: %PROJ%
  exit /b 1
)
cd /d "%PROJ%"
if not exist "%PROJ%\logs" mkdir "%PROJ%\logs"
set "LOG=%PROJ%\logs\last-run.log"

echo. > "%LOG%"
echo [mark] A-entered-batch >> "%LOG%"

REM === PATH sağlam ===
set "PATH=C:\Program Files\nodejs;%USERPROFILE%\AppData\Roaming\npm;%PATH%"
echo [env] USERNAME=%USERNAME% >> "%LOG%"
echo [env] PATH=%PATH% >> "%LOG%"
echo [mark] B-after-env >> "%LOG%"

echo [check] node --version >> "%LOG%"
node --version >> "%LOG%" 2>&1

echo [check] npm --version >> "%LOG%"
call npm --version >> "%LOG%" 2>&1

echo [mark] C-after-node-npm >> "%LOG%"

REM === Çalıştır ===
set "NPX=C:\Program Files\nodejs\npx.cmd"
if not exist "%NPX%" set "NPX=%USERPROFILE%\AppData\Roaming\npm\npx.cmd"

if exist "%NPX%" (
  echo [check] using npx at "%NPX%" >> "%LOG%"
  echo [run] npx -y tsx .\src\index.ts >> "%LOG%"
  call "%NPX%" -y tsx .\src\index.ts >> "%LOG%" 2>&1
) else (
  echo [warn] npx not found, fallback to node --import tsx >> "%LOG%"
  echo [run] node --import tsx .\src\index.ts >> "%LOG%"
  node --import tsx .\src\index.ts >> "%LOG%" 2>&1
)

echo [mark] D-after-run >> "%LOG%"
echo [done] errorlevel=%ERRORLEVEL% >> "%LOG%"
exit /b %ERRORLEVEL%
