# dev-win.ps1 – Levanta backend (FastAPI) y frontend (Vite) en ventanas separadas

# === Ajustes rápidos (si cambias puertos o rutas) ===
$BACKEND_DIR   = "backend"
$FRONTEND_DIR  = "frontend"
$UVICORN_APP   = "app.main:app"
$BACKEND_PORT  = 8000
$FRONTEND_PORT = 5173
$API_PREFIX    = "/api"

# Tu ruta detectada por logs:
$NDJSON_PATH   = "C:/asphyxia/savedata/ddr@mdx.db"

Write-Host "== Preparando entorno ==" -ForegroundColor Cyan

# --- Backend: venv + deps ---
Write-Host "`n[Backend] Preparando venv y dependencias..." -ForegroundColor Yellow
Push-Location $BACKEND_DIR
if (!(Test-Path ".venv")) {
    Write-Host "Creando entorno virtual (.venv)..." -ForegroundColor Gray
    py -m venv .venv
}
# Asegurar pip actualizado e instalar requirements si existe
.\.venv\Scripts\python.exe -m pip install --upgrade pip | Out-Null
if (Test-Path "requirements.txt") {
    .\.venv\Scripts\pip.exe install -r requirements.txt
} else {
    Write-Host "No hay requirements.txt (se omite instalación)" -ForegroundColor DarkGray
}
Pop-Location

# --- Frontend: deps + .env.local con VITE_API_URL ---
Write-Host "`n[Frontend] Instalando dependencias..." -ForegroundColor Yellow
Push-Location $FRONTEND_DIR
if (Test-Path "pnpm-lock.yaml" -and (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    pnpm install
} elseif (Test-Path "package-lock.json") {
    npm ci
} else {
    npm install
}
# Generar/actualizar .env.local para Vite
$envFile = ".env.local"
$viteApi = "http://localhost:$BACKEND_PORT$API_PREFIX"
$envContent = @(
    "VITE_API_URL=$viteApi"
)
Set-Content -Path $envFile -Value ($envContent -join "`r`n") -Encoding UTF8
Write-Host "[Frontend] Escribí $envFile con VITE_API_URL=$viteApi" -ForegroundColor DarkGray
Pop-Location

# --- Lanzar Backend en nueva ventana ---
Write-Host "`n[Backend] Levantando en puerto $BACKEND_PORT..." -ForegroundColor Green
$backendCmd = @"
`$env:NDJSON_PATH = "$NDJSON_PATH"
`$env:BACKEND_PORT = "$BACKEND_PORT"
Set-Location "$((Resolve-Path $BACKEND_DIR).Path)"
.\.venv\Scripts\python.exe -m uvicorn $UVICORN_APP --reload --host 0.0.0.0 --port $BACKEND_PORT
"@
Start-Process powershell -ArgumentList "-NoExit","-Command",$backendCmd | Out-Null

# --- Lanzar Frontend en nueva ventana ---
Write-Host "[Frontend] Levantando en puerto $FRONTEND_PORT..." -ForegroundColor Green
$frontendCmd = @"
`$env:VITE_API_URL = "$viteApi"
Set-Location "$((Resolve-Path $FRONTEND_DIR).Path)"
npm run dev -- --port $FRONTEND_PORT --host
"@
Start-Process powershell -ArgumentList "-NoExit","-Command",$frontendCmd | Out-Null

Write-Host "`n== Todo listo =="
Write-Host "API:      http://localhost:$BACKEND_PORT$API_PREFIX"
Write-Host "Docs:     http://localhost:$BACKEND_PORT/docs"
Write-Host "Frontend: http://localhost:$FRONTEND_PORT"
