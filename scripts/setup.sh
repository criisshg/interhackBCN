#!/usr/bin/env bash
# Pulse · quick setup (Mac / Linux · bash)
# Uso: bash scripts/setup.sh
#
# Crea venv Python, instala todas las dependencias (Python + Node),
# copia .env.example a .env si no existe.

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

step()  { echo -e "\n${CYAN}==> $1${NC}"; }
ok()    { echo -e "    ${GREEN}OK · $1${NC}"; }
warn()  { echo -e "    ${YELLOW}WARN · $1${NC}"; }
fatal() { echo -e "\n${YELLOW}ERROR · $1${NC}"; exit 1; }

# --- Verificar prerequisitos ---
step "Verificando prerequisitos"

command -v python3 >/dev/null 2>&1 || fatal "Python3 no encontrado. Instala Python 3.11+"
PY_VERSION=$(python3 --version)
ok "Python detectado: $PY_VERSION"

if command -v node >/dev/null 2>&1; then
    ok "Node detectado: $(node --version)"
else
    warn "Node.js no encontrado. Solo P3 (el Cid) lo necesita."
fi

command -v git >/dev/null 2>&1 || fatal "Git no encontrado"
ok "Git detectado"

# --- Crear venv Python ---
step "Creando entorno virtual Python (.venv)"

if [ -d ".venv" ]; then
    ok ".venv ya existe, lo reuso"
else
    python3 -m venv .venv
    ok ".venv creado"
fi

VENV_PYTHON=".venv/bin/python"
VENV_PIP=".venv/bin/pip"

# --- Instalar dependencias Python ---
step "Instalando dependencias Python (puede tardar 2-3 min)"
"$VENV_PYTHON" -m pip install --upgrade pip --quiet
"$VENV_PIP" install -r requirements.txt
ok "Dependencias Python instaladas"

# --- Instalar dependencias Node (si Node existe) ---
if command -v node >/dev/null 2>&1; then
    step "Instalando dependencias Node (apps/web)"
    (cd apps/web && npm install)
    ok "Dependencias Node instaladas"
fi

# --- Copiar .env.example a .env si no existe ---
step "Configurando archivos .env"

[ -f .env ] && ok ".env ya existe, no lo toco" || { cp .env.example .env; ok ".env creado · EDÍTALO con tus valores reales"; }
[ -f apps/web/.env.local ] && ok "apps/web/.env.local ya existe" || { cp apps/web/.env.example apps/web/.env.local; ok "apps/web/.env.local creado"; }
[ -f apps/api/.env ] && ok "apps/api/.env ya existe" || { cp apps/api/.env.example apps/api/.env; ok "apps/api/.env creado"; }

# --- Resumen ---
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  Setup completo.${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "${CYAN}Siguientes pasos:${NC}"
echo "  1. Activa el venv:    source .venv/bin/activate"
echo "  2. Edita .env con tus valores reales (DATABASE_URL, ANTHROPIC_API_KEY, ...)"
echo "  3. Cambia a tu branch:  git checkout p1-ml | p2-api | p3-web | p4-agent | p5-infra"
echo "  4. Lee docs/TEAM.md para tu checklist pre-kickoff"
echo ""
echo -e "${CYAN}Para arrancar en local:${NC}"
echo "  - API:  cd apps/api && uvicorn main:app --reload"
echo "  - Web:  cd apps/web && npm run dev"
echo ""
