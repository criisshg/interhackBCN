from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import alerts, clients, actions, chat, recalc, voice

app = FastAPI(title="Pulse API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
app.include_router(clients.router, prefix="/clients", tags=["clients"])
app.include_router(actions.router, prefix="/actions", tags=["actions"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(recalc.router, tags=["recalc"])
app.include_router(voice.router, prefix="/voice", tags=["voice"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
