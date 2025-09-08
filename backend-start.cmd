@echo off
title backend - uvicorn
cd /d "%~dp0backend"

REM Ajusta tu ruta NDJSON aquí:
set "NDJSON_PATH=C:\asphyxia\savedata\ddr@mdx.db"

REM Crear venv si falta
if not exist ".venv\Scripts\python.exe" (
  echo [Backend] Creando .venv...
  where py >nul 2>nul && ( py -m venv .venv ) || ( python -m venv .venv )
)

echo [Backend] Iniciando en :8000 ...
".venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

echo.
echo [Backend finalizado] Presiona una tecla para cerrar...
pause >nul
