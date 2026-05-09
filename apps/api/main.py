import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import init_db
from errors import install_error_handlers
from routers import actions, alerts, chat, clients, metrics, recalc, stats

API_DIR = Path(__file__).resolve().parent
load_dotenv(API_DIR.parent.parent / ".env")
load_dotenv(API_DIR / ".env")

app = FastAPI(title="Pulse API", version="0.1.0")

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
app.include_router(clients.router, prefix="/clients", tags=["clients"])
app.include_router(actions.router, prefix="/actions", tags=["actions"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(stats.router, prefix="/stats", tags=["stats"])
app.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
app.include_router(recalc.router, tags=["recalc"])

install_error_handlers(app)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
