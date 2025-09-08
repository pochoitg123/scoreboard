from fastapi import APIRouter, HTTPException, Response, Request
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import json

from app.auth.security import (
    hash_password, verify_password,
    create_access_token, decode_token,
    create_reset_token, decode_reset_token
)
from app.auth.storage import (
    find_user, find_user_by_email,
    create_user, update_password,
    add_reset_token, consume_reset_token,
    # añade:
    find_user_any,
)
from app.core.config import settings
from app.auth.emailer import send_password_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_NAME = "access_token"

class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    refid: str = Field(min_length=4, max_length=64)

class LoginIn(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    username: str
    linked: dict | None = None

def _find_profile_by_refid(refid: str) -> Optional[Dict[str, Any]]:
    path = settings.NDJSON_PATH
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                if obj.get("collection") != "profile3":
                    continue
                if obj.get("__refid") == refid:
                    return {
                        "dancerName": obj.get("dancerName"),
                        "__refid": obj.get("__refid"),
                        "pcbid": obj.get("pcbid"),
                    }
    except FileNotFoundError:
        return None
    return None

@router.post("/register", response_model=UserOut)
def register(payload: RegisterIn):
    if find_user(payload.username):
        raise HTTPException(400, "Username already exists")
    if find_user_by_email(str(payload.email).lower()):
        raise HTTPException(400, "Email already registered")

    prof = _find_profile_by_refid(payload.refid)
    if not prof:
        raise HTTPException(400, "refid inválido (no existe en profile3)")
    # si ese refid ya fue tomado por otro usuario:
    from app.auth.storage import is_refid_taken
    if is_refid_taken(payload.refid):
        raise HTTPException(400, "refid ya está vinculado a otra cuenta")

    user = create_user(
        username=payload.username,
        email=str(payload.email).lower(),
        password_hash=hash_password(payload.password),
        linked=prof,
    )
    return {"username": user["username"], "linked": user["linked"]}

@router.post("/login", response_model=UserOut)
def login(payload: LoginIn, response: Response):
    user = find_user_any(payload.username)  # <--- antes: find_user(payload.username)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token(user["username"])
    response.set_cookie(
        key=COOKIE_NAME, value=token,
        httponly=True, samesite="lax", secure=False, path="/",
    )
    return {"username": user["username"], "linked": user["linked"]}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}

# -------- Password reset --------
class ForgotIn(BaseModel):
    email: EmailStr

@router.post("/forgot")
def forgot_password(payload: ForgotIn):
    user = find_user_by_email(str(payload.email).lower())
    # responder 200 siempre (evita user enumeration)
    if not user:
        return {"ok": True}
    token = create_reset_token(user["username"], minutes=30)
    # guarda token (para poder invalidarlo/consumirlo)
    exp_ts = int((datetime.now(timezone.utc) + timedelta(minutes=30)).timestamp())
    add_reset_token(user["username"], token, exp_ts)

    link = settings.FRONTEND_RESET_URL + token
    send_password_reset_email(user["email"], link)
    return {"ok": True}

class ResetIn(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=128)

@router.post("/reset")
def reset_password(payload: ResetIn):
    # validación doble: JWT válido y que esté en storage
    sub = decode_reset_token(payload.token)
    if not sub:
        raise HTTPException(400, "Token inválido o expirado")
    owner = consume_reset_token(payload.token)
    if owner != sub:
        raise HTTPException(400, "Token inválido o expirado")

    update_password(sub, hash_password(payload.new_password))
    return {"ok": True}
