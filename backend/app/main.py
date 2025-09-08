# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routers import scores, songs, stats, auth, me, customize  # ← incluye customize
from app.services.cache import cache

app = FastAPI(title="PIU/DDR Scores (NDJSON)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # p.ej. ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers de autenticación/perfil/customize
app.include_router(auth.router)       # /auth/*
app.include_router(me.router)         # /me/*
app.include_router(customize.router)  # /me/customize  ← importa y monta

# Routers existentes
app.include_router(scores.router)
app.include_router(songs.router)                
app.include_router(stats.router)

@app.on_event("startup")
def _startup():
    cache.force_reload()
    print(">>> NDJSON_PATH =", settings.NDJSON_PATH)  # debug útil

@app.get("/healthz")
def healthz():
    return {"ok": True}
