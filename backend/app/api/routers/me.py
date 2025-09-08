# app/api/routers/me.py
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Tuple, Any

from app.auth.storage import find_user
from app.auth.security import decode_token
from app.services.ndjson_writer import read_profile3_fields, update_profile3_fields
from app.services.ndjson_customize import read_customize, update_customize

router = APIRouter(prefix="/me", tags=["me"])

def current_username(req: Request) -> str:
    token = req.cookies.get("access_token") or ""
    sub = decode_token(token)
    if not sub:
        raise HTTPException(status_code=401, detail="No autenticado")
    return sub

# === SOLO core permitido en profile3 (debe coincidir con ndjson_writer.py) ===
CORE_KEYS = {
    "dancerName","weight","isDispWeight","subscribed",
    "opArrowDesign","opGuideline","opLaneFilter","opJudgePriority","opTimingDisp",
}

# === customize (van a customize3, NO a profile3) ===
CUSTOM_KEYS = {
    "appealBoardId","characterP1Id","characterP2Id",
    "laneBgSingleId","laneBgDoubleId","laneCoverSingleId","laneCoverDoubleId",
    "gameBGSystemId","gameBGPlayId","songVidId",
}

# MAP confirmado desde tu web (profile_settings.js)
MAP: Dict[str, Tuple[int,int]] = {
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

class ProfilePatch(BaseModel):
    # core
    dancerName: Optional[str] = None
    weight: Optional[int] = None
    isDispWeight: Optional[bool] = None
    subscribed: Optional[bool] = None
    opArrowDesign: Optional[int] = None
    opGuideline: Optional[int] = None
    opLaneFilter: Optional[int] = None
    opJudgePriority: Optional[int] = None
    opTimingDisp: Optional[int] = None
    # customize (solo para captarlos y derivarlos)
    characterP1Id: Optional[int] = None
    characterP2Id: Optional[int] = None
    appealBoardId: Optional[int] = None
    laneBgSingleId: Optional[int] = None
    laneBgDoubleId: Optional[int] = None
    laneCoverSingleId: Optional[int] = None
    laneCoverDoubleId: Optional[int] = None
    gameBGSystemId: Optional[int] = None
    gameBGPlayId: Optional[int] = None
    songVidId: Optional[int] = None

# === ENDPOINTS ===

@router.get("", response_model=dict)
def get_me(username: str = Depends(current_username)):
    """
    Devuelve lo que espera el frontend para 'estar logueado'.
    """
    user = find_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {
        "username": user["username"],
        "email": user.get("email"),
        "linked": user.get("linked"),
    }

@router.get("/profile", response_model=Dict[str, Any])
def get_my_profile(username: str = Depends(current_username)):
    user = find_user(username)
    if not user or not user.get("linked"):
        raise HTTPException(status_code=400, detail="No tienes un jugador vinculado")
    snap = read_profile3_fields(user["linked"])
    if not snap:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return snap

@router.put("/profile", response_model=dict)
def update_my_profile(patch: ProfilePatch, username: str = Depends(current_username)):
    """
    Acepta payloads viejos del front: separa core (profile3) de customize (customize3).
    """
    user = find_user(username)
    if not user or not user.get("linked"):
        raise HTTPException(status_code=400, detail="No tienes un jugador vinculado")

    data = patch.model_dump(exclude_none=True)

    core_patch   = {k: v for k, v in data.items() if k in CORE_KEYS}
    custom_patch = {k: v for k, v in data.items() if k in CUSTOM_KEYS}

    if core_patch:
        if not update_profile3_fields(user["linked"], core_patch):
            raise HTTPException(status_code=404, detail="Perfil no encontrado o sin cambios")

    if custom_patch:
        changes = {MAP[k]: int(v) for k, v in custom_patch.items() if k in MAP}
        update_customize(user["linked"], changes)

    return {"ok": True}
