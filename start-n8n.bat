@echo off
echo ========================================
echo   OpenThaiAi — n8n Workflow Engine
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
