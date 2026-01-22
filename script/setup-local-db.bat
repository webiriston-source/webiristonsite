@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem Use UTF-8 for readable Cyrillic output
chcp 65001 >nul

set "CONTAINER=mydevsite-db"
set "DB_NAME=mydevsite"
set "DB_USER=postgres"
set "DB_PASS=postgres"

echo [1/5] Checking Docker...
docker info >nul 2>nul
if errorlevel 1 (
  echo Docker is not running or not installed. Start Docker Desktop and try again.
  exit /b 1
)

echo [2/5] Selecting a free port (try 5433..5440)...
set "HOST_PORT="
for %%p in (5433 5434 5435 5436 5437 5438 5439 5440) do (
  call :PORT_FREE %%p
  if "!PORT_OK!"=="1" (
    set "HOST_PORT=%%p"
    goto :PORT_SELECTED
  )
)
:PORT_SELECTED
if "%HOST_PORT%"=="" (
  echo Could not find a free port in range 5433..5440. Free one of these ports and try again.
  exit /b 1
)
echo Using port %HOST_PORT%.

echo [3/5] Recreating container %CONTAINER% on port %HOST_PORT%...
docker rm -f %CONTAINER% >nul 2>nul

docker run --name %CONTAINER% ^
  -e POSTGRES_USER=%DB_USER% ^
  -e POSTGRES_PASSWORD=%DB_PASS% ^
  -e POSTGRES_DB=%DB_NAME% ^
  -p %HOST_PORT%:5432 ^
  -d postgres:16 >nul

if errorlevel 1 (
  echo Failed to start Postgres container on %HOST_PORT%.
  echo If you are running another Postgres/DB on that port, stop it or use a different port range in this script.
  exit /b 1
)

echo [4/5] Waiting for Postgres to be ready...
for /l %%i in (1,1,40) do (
  docker exec %CONTAINER% pg_isready -U %DB_USER% -d %DB_NAME% >nul 2>nul
  if not errorlevel 1 goto :READY
  timeout /t 1 >nul
)

echo Postgres did not become ready in time.
echo Run: docker logs %CONTAINER%
exit /b 1

:READY
echo Postgres is ready.

echo [5/5] Writing DATABASE_URL into .env (with backup)...
set "ENV_FILE=%CD%\.env"

if exist "%ENV_FILE%" (
  copy "%ENV_FILE%" "%ENV_FILE%.bak" >nul
)

call :UPSERT_ENV DATABASE_URL postgresql://%DB_USER%:%DB_PASS%@localhost:%HOST_PORT%/%DB_NAME%

echo Done.
echo DATABASE_URL=postgresql://%DB_USER%:%DB_PASS%@localhost:%HOST_PORT%/%DB_NAME%
exit /b 0

:PORT_FREE
set "PORT_OK=0"
for /f "tokens=1,2,3,4,5" %%a in ('netstat -ano ^| findstr /R /C:":%1 " 2^>nul') do (
  rem If any line matched, port is in use
  set "PORT_OK=0"
  goto :EOF
)
set "PORT_OK=1"
goto :EOF

:UPSERT_ENV
set "KEY=%~1"
set "VAL=%~2"
set "TMP=%TEMP%\mydevsite_env_tmp_%RANDOM%.txt"

if exist "%ENV_FILE%" (
  findstr /v /b /c:"%KEY%=" "%ENV_FILE%" > "%TMP%"
) else (
  type nul > "%TMP%"
)

>>"%TMP%" echo %KEY%=%VAL%
move /y "%TMP%" "%ENV_FILE%" >nul
exit /b 0
