@echo off
setlocal
set "ROOT=%~dp0"

start "backend" "%ROOT%backend-start.cmd"
REM Pequeña pausa para que el backend tome el puerto
timeout /t 2 >nul
start "frontend" "%ROOT%frontend-start.cmd"

echo.
echo === Lanzado ===
echo API:      http://localhost:8000
echo Docs:     http://localhost:8000/docs
echo Frontend: http://localhost:5173
echo.
endlocal
