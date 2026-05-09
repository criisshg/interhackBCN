# Pulse · quick setup (Windows · PowerShell)
# Uso: .\scripts\setup.ps1
#
# Crea venv Python, instala todas las dependencias (Python + Node),
# copia .env.example a .env si no existe.

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "    OK · $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "    WARN · $Message" -ForegroundColor Yellow
}

# --- Verificar prerequisitos ---
Write-Step "Verificando prerequisitos"

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python no encontrado. Instala Python 3.11+ desde https://www.python.org/downloads/"
}
$pyVersion = (python --version 2>&1).ToString()
Write-Ok "Python detectado: $pyVersion"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Warn "Node.js no encontrado. Solo P3 (el Cid) lo necesita. Instálalo desde https://nodejs.org/ si vas a tocar apps/web"
} else {
    $nodeVersion = (node --version 2>&1).ToString()
    Write-Ok "Node detectado: $nodeVersion"
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Git no encontrado. Instálalo desde https://git-scm.com/"
}
Write-Ok "Git detectado"

# --- Crear venv Python ---
Write-Step "Creando entorno virtual Python (.venv)"

if (Test-Path ".venv") {
    Write-Ok ".venv ya existe, lo reuso"
} else {
    python -m venv .venv
    Write-Ok ".venv creado"
}

$venvPython = ".\.venv\Scripts\python.exe"
$venvPip = ".\.venv\Scripts\pip.exe"

# --- Instalar dependencias Python ---
Write-Step "Instalando dependencias Python (puede tardar 2-3 min)"
& $venvPython -m pip install --upgrade pip --quiet
& $venvPip install -r requirements.txt
Write-Ok "Dependencias Python instaladas"

# --- Instalar dependencias Node (si Node existe) ---
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Step "Instalando dependencias Node (apps/web)"
    Push-Location apps\web
    npm install
    Pop-Location
    Write-Ok "Dependencias Node instaladas"
}

# --- Copiar .env.example a .env si no existe ---
Write-Step "Configurando archivos .env"

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Ok ".env creado desde .env.example · EDÍTALO con tus valores reales"
} else {
    Write-Ok ".env ya existe, no lo toco"
}

if (-not (Test-Path "apps\web\.env.local")) {
    Copy-Item "apps\web\.env.example" "apps\web\.env.local"
    Write-Ok "apps\web\.env.local creado"
} else {
    Write-Ok "apps\web\.env.local ya existe"
}

if (-not (Test-Path "apps\api\.env")) {
    Copy-Item "apps\api\.env.example" "apps\api\.env"
    Write-Ok "apps\api\.env creado"
} else {
    Write-Ok "apps\api\.env ya existe"
}

# --- Resumen ---
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Setup completo." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Siguientes pasos:" -ForegroundColor Cyan
Write-Host "  1. Activa el venv:    .\.venv\Scripts\Activate.ps1"
Write-Host "  2. Edita .env con tus valores reales (DATABASE_URL, ANTHROPIC_API_KEY, ...)"
Write-Host "  3. Cambia a tu branch:  git checkout p1-ml | p2-api | p3-web | p4-agent | p5-infra"
Write-Host "  4. Lee docs\TEAM.md para tu checklist pre-kickoff"
Write-Host ""
Write-Host "Para arrancar en local:" -ForegroundColor Cyan
Write-Host "  - API:  cd apps\api && uvicorn main:app --reload"
Write-Host "  - Web:  cd apps\web && npm run dev"
Write-Host ""
