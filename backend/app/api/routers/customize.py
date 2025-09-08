# app/api/routers/customize.py
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, Tuple
from app.auth.storage import find_user
from app.auth.security import decode_token
from app.services.ndjson_customize import read_customize, update_customize

router = APIRouter(prefix="/me/customize", tags=["me"])

def current_username(req: Request) -> str:
    token = req.cookies.get("access_token") or ""
    sub = decode_token(token)
    if not sub:
        raise HTTPException(status_code=401, detail="No autenticado")
    return sub

# MAPEOS (ajústalos a tu juego si difieren)
# Nota: son EJEMPLOS. Confirmar con tus archivos reales (ver más abajo "Cómo confirmar categorías").
MAP = {
    "appealBoardId":     (1, 1),
    "characterP1Id":     (2, 1),
    "characterP2Id":     (2, 2),
    "gameBGSystemId":    (3, 1),
    "gameBGPlayId":      (3, 2),
    "laneBgSingleId":    (4, 1),
    "laneBgDoubleId":    (5, 1),
    "laneCoverSingleId": (6, 1),
    "laneCoverDoubleId": (7, 1),
    "songVidId":         (8, 1),
}


class CustomizePatch(BaseModel):
    characterP1Id: int | None = None
    characterP2Id: int | None = None
    appealBoardId: int | None = None
    laneBgSingleId: int | None = None
    laneBgDoubleId: int | None = None
    laneCoverSingleId: int | None = None
    laneCoverDoubleId: int | None = None
    gameBGSystemId: int | None = None
    gameBGPlayId: int | None = None
    songVidId: int | None = None

@router.get("", response_model=dict)
def get_customize(username: str = Depends(current_username)):
    user = find_user(username)
    if not user or not user.get("linked"):
        raise HTTPException(status_code=400, detail="No tienes un jugador vinculado")

    raw = read_customize(user["linked"])  # {(cat,pat):key}
    # invertimos a nombres amigables
    out = {}
    for name, pair in MAP.items():
        if pair in raw:
            out[name] = raw[pair]
    return out

@router.put("", response_model=dict)
def put_customize(patch: CustomizePatch, username: str = Depends(current_username)):
    user = find_user(username)
    if not user or not user.get("linked"):
        raise HTTPException(status_code=400, detail="No tienes un jugador vinculado")

    payload = patch.model_dump(exclude_none=True)
    if not payload:
        return {"ok": True, "updated": {}}

    # traducimos a {(cat,pat): key}
    changes: Dict[Tuple[int,int], int] = {}
    for name, val in payload.items():
        if name not in MAP:
            continue
        changes[MAP[name]] = int(val)

    updated = update_customize(user["linked"], changes)
    return {"ok": True, "updated": {name: updated.get(MAP[name]) for name in payload if MAP[name] in updated}}
