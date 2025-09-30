@echo off
REM Toronto JobBot - Daily run via Task Scheduler
setlocal enableextensions

REM === PATH takviyesi (pnpm/node bazı ortamlarda görünmüyor) ===
set PATH=C:\Program Files\nodejs\;C:\Users\orcny\AppData\Roaming\npm;%PATH%

REM === Proje yolu ===
set PROJECT_DIR=C:\toronto-jobbot-v1

REM Log klasörü
set LOG_DIR=%PROJECT_DIR%\logs
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM Timestamp
for /f "tokens=1-3 delims=/- " %%a in ("%date%") do set today=%%c-%%a-%%b
set nowtime=%time: =0%
set nowtime=%nowtime::=-%
set TS=%today%_%nowtime%

echo [%date% %time%] Starting JobBot > "%LOG_DIR%\run_%TS%.log" 2>&1
pushd "%PROJECT_DIR%"

REM === Eğer node_modules yoksa otomatik kur ===
if not exist node_modules (
  echo [%date% %time%] Installing deps... >> "%LOG_DIR%\run_%TS%.log" 2>&1
  call pnpm install >> "%LOG_DIR%\run_%TS%.log" 2>&1
)

REM === Ana akış ===
echo [%date% %time%] pnpm start >> "%LOG_DIR%\run_%TS%.log" 2>&1
call pnpm start >> "%LOG_DIR%\run_%TS%.log" 2>&1

echo [%date% %time%] pnpm followups >> "%LOG_DIR%\run_%TS%.log" 2>&1
call pnpm followups >> "%LOG_DIR%\run_%TS%.log" 2>&1

popd
echo [%date% %time%] Done >> "%LOG_DIR%\run_%TS%.log"
endlocal
