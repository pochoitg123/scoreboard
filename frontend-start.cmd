@echo off
title frontend - vite
cd /d "%~dp0frontend"

REM SIN /api para evitar 404 (a menos que tu backend tenga prefijo /api)
> ".env.local" echo VITE_API_URL=http://localhost:8000

REM Arranca Vite
npm run dev -- --port 5173 --host

echo.
echo [Frontend finalizado] Presiona una tecla para cerrar...
pause >nul
