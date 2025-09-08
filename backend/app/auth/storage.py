import json, uuid, os, threading, time
from typing import Optional, Dict, Any, List
from app.core.config import settings

_lock = threading.Lock()

def _load() -> Dict[str, Any]:
    if not os.path.exists(settings.USERS_JSON_PATH):
        return {"users": []}
    with open(settings.USERS_JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def _save(data: Dict[str, Any]):
    tmp = settings.USERS_JSON_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, settings.USERS_JSON_PATH)

def find_user(username: str) -> Optional[Dict[str, Any]]:
    data = _load()
    for u in data.get("users", []):
        if u.get("username") == username:
            return u
    return None

def find_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    data = _load()
    for u in data.get("users", []):
        if u.get("email") == email:
            return u
    return None

def is_refid_taken(refid: str) -> bool:
    data = _load()
    for u in data.get("users", []):
        linked = u.get("linked") or {}
        if linked.get("__refid") == refid:
            return True
    return False

def create_user(username: str, email: str, password_hash: str, linked: Dict[str, Any]) -> Dict[str, Any]:
    with _lock:
        data = _load()
        if any(u.get("username") == username for u in data.get("users", [])):
            raise ValueError("username_taken")
        if any(u.get("email") == email for u in data.get("users", [])):
            raise ValueError("email_taken")
        if is_refid_taken(linked.get("__refid", "")):
            raise ValueError("refid_taken")
        user = {
            "id": str(uuid.uuid4()),
            "username": username,
            "email": email,
            "password_hash": password_hash,
            "linked": linked,        # {"dancerName","__refid","pcbid"}
            "reset_tokens": []       # [{"token": "...", "exp": 1234567890}]
        }
        data.setdefault("users", []).append(user)
        _save(data)
        return user

def add_reset_token(username: str, token: str, exp_ts: int):
    with _lock:
        data = _load()
        for u in data.get("users", []):
            if u.get("username") == username:
                u.setdefault("reset_tokens", [])
                # limpiar expirados
                u["reset_tokens"] = [t for t in u["reset_tokens"] if t.get("exp", 0) > int(time.time())]
                u["reset_tokens"].append({"token": token, "exp": exp_ts})
                _save(data)
                return
        raise ValueError("user_not_found")

def consume_reset_token(token: str) -> Optional[str]:
    now = int(time.time())
    with _lock:
        data = _load()
        for u in data.get("users", []):
            tokens: List[Dict[str, Any]] = u.get("reset_tokens", [])
            for t in tokens:
                if t.get("token") == token and t.get("exp", 0) > now:
                    # consume
                    u["reset_tokens"] = [x for x in tokens if x is not t]
                    _save(data)
                    return u.get("username")
    return None

def update_password(username: str, new_hash: str):
    with _lock:
        data = _load()
        for u in data.get("users", []):
            if u.get("username") == username:
                u["password_hash"] = new_hash
                # invalida todos los reset tokens restantes
                u["reset_tokens"] = []
                _save(data)
                return
        raise ValueError("user_not_found")

def update_link(username: str, linked: Dict[str, Any] | None) -> Dict[str, Any]:
    with _lock:
        data = _load()
        if linked and is_refid_taken(linked.get("__refid", "")):
            # permitir si es el mismo usuario
            for u in data.get("users", []):
                if u.get("username") == username:
                    curr = (u.get("linked") or {}).get("__refid")
                    if curr == linked.get("__refid"):
                        break
            else:
                raise ValueError("refid_taken")
        for u in data.get("users", []):
            if u.get("username") == username:
                u["linked"] = linked
                _save(data)
                return u
    raise ValueError("user_not_found")
def delete_user(username: str) -> bool:
    """Elimina un usuario por username. Devuelve True si existía y se borró."""
    with _lock:
        data = _load()
        users = data.get("users", [])
        new_users = [u for u in users if u.get("username") != username]
        if len(new_users) == len(users):
            return False
        data["users"] = new_users
        _save(data)
        return True
def find_user_any(identifier: str) -> Optional[Dict[str, Any]]:
    """Busca por username (exacto o case-insensitive) o por email (case-insensitive)."""
    data = _load()
    ident_low = (identifier or "").strip().lower()
    for u in data.get("users", []):
        uname = (u.get("username") or "")
        mail  = (u.get("email") or "")
        if uname == identifier:
            return u
        if uname.lower() == ident_low:
            return u
        if mail.lower() == ident_low:
            return u
    return None


