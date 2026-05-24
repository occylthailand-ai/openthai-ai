@echo off
REM ============================================================
REM  OpenThai AI — n8n Workflow Engine (Windows launcher)
REM
REM  Alternative: start n8n via Docker instead of running it
REM  natively. Make sure Docker Desktop is running, then use:
REM
REM    docker-compose up n8n -d
REM
REM  To stop:  docker-compose stop n8n
REM  Logs:     docker-compose logs -f n8n
REM ============================================================
echo ========================================
echo   OpenThai AI — n8n Workflow Engine
echo ========================================
echo.

REM โหลด env จาก backend/.env
for /f "tokens=1,2 delims==" %%a in (backend\.env) do (
  if not "%%a"=="" if not "%%b"=="" (
    set %%a=%%b
  )
)

REM ตั้งค่า n8n
set N8N_PORT=5678
set N8N_PROTOCOL=http
set N8N_HOST=localhost
set N8N_BASIC_AUTH_ACTIVE=false
set EXECUTIONS_PROCESS=main
set N8N_METRICS=true

echo [INFO] Starting n8n on http://localhost:5678
echo [INFO] Gemini Key: %GEMINI_API_KEY:~0,8%...
echo.

n8n start

pause
