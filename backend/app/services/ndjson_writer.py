from __future__ import annotations
import json, os, tempfile, shutil
from typing import Any, Dict, Optional
from app.core.config import settings

PROFILE_COLLECTION = "profile3"

# === SOLO CAMPOS CORE permitidos en PATCH de /me/profile ===
ALLOWED_KEYS: dict[str, type] = {
    # Básicos
    "dancerName": str,
    "weight": int,          # acepta int/float
    "isDispWeight": bool,
    "subscribed": bool,

    # Opciones/visuales existentes
    "opArrowDesign": int,
    "opGuideline": int,
    "opLaneFilter": int,
    "opJudgePriority": int,
    "opTimingDisp": int,
}

# Campos de customize que NO deben existir en profile3
CUSTOM_KEYS = {
    "characterP1Id","characterP2Id","appealBoardId",
    "laneBgSingleId","laneBgDoubleId",
    "laneCoverSingleId","laneCoverDoubleId",
    "gameBGSystemId","gameBGPlayId","songVidId",
}


def _coerce_value(expected_type: type, value: Any) -> Any:
    """Convierte value al tipo esperado con tolerancia (int/float/bool/str)."""
    try:
        if expected_type is float:
            # aceptar ints
            return float(value)
        if expected_type is int:
            return int(value)
        if expected_type is bool:
            if isinstance(value, bool):
                return value
            if isinstance(value, (int, float)):
                return bool(value)
            if isinstance(value, str):
                return value.strip().lower() in ("1", "true", "t", "yes", "y", "on")
            return False
        if expected_type is str:
            return str(value)
    except Exception:
        # si no se puede convertir, devolvemos None para saltarlo
        return None
    return value


def _match_profile(obj: Dict[str, Any], linked: Dict[str, Any]) -> bool:
    """Coincide contra la línea si corresponde al mismo jugador vinculado."""
    if obj.get("collection") != PROFILE_COLLECTION:
        return False

    # Prioridad de matching: __refid > ddrCode > dancerName
    refid = (linked.get("__refid") or "").strip()
    if refid and (obj.get("__refid") or "").strip() == refid:
        return True

    ddr_code = linked.get("ddrCode")
    if ddr_code is not None and obj.get("ddrCode") == ddr_code:
        return True

    name = (linked.get("dancerName") or "").strip()
    if name and (obj.get("dancerName") or "").strip() == name:
        return True

    return False


def update_profile3_fields(linked: Dict[str, Any], patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    APPEND-ONLY:
      - Toma la ÚLTIMA coincidencia profile3 del usuario como base (si existe).
      - Aplica solo campos CORE permitidos (ver ALLOWED_KEYS) y purga customize.
      - CREA una NUEVA línea profile3 con _id + createdAt/updatedAt actuales.
      - NO modifica ni elimina líneas anteriores (preserva historial).
      - Devuelve snapshot de lo que quedó en la nueva línea.
    """
    path = settings.NDJSON_PATH
    if not os.path.exists(path):
        return None

    # Normalizar y filtrar patch
    normalized: Dict[str, Any] = {}
    for k, v in patch.items():
        if k not in ALLOWED_KEYS:
            continue
        coerced = _coerce_value(ALLOWED_KEYS[k], v)
        if coerced is None:
            continue
        normalized[k] = coerced

    if not normalized:
        return None

    # 1) buscar ÚLTIMA coincidencia como base
    last_obj = None
    with open(path, "r", encoding="utf-8") as rf:
        for line in rf:
            s = line.strip()
            if not s:
                continue
            try:
                obj = json.loads(s)
            except Exception:
                continue
            if _match_profile(obj, linked):
                last_obj = obj

    # 2) construir objeto base para la nueva línea
    from collections import OrderedDict
    import time, random, string, tempfile, shutil

    now_ms = int(time.time() * 1000)

    base = OrderedDict()
    if last_obj and isinstance(last_obj, dict):
        # copia superficial de la última
        for k, v in last_obj.items():
            base[k] = v

    # asegurar colección e identificadores mínimos
    base["collection"] = PROFILE_COLLECTION

    # IDs de usuario desde 'linked' (prioriza __refid)
    refid = (linked.get("__refid") or "").strip()
    if refid:
        base["__refid"] = refid
    if linked.get("ddrCode") is not None:
        base["ddrCode"] = linked.get("ddrCode")
    if linked.get("dancerName"):
        base["dancerName"] = (linked.get("dancerName") or "").strip()

    # purgar cualquier rastro de customize
    for bad in list(CUSTOM_KEYS):
        base.pop(bad, None)

    # aplicar patch (solo core)
    for k, v in normalized.items():
        base[k] = v

    # setear nuevo _id y timestamps actuales
    rid = "".join(random.choice(string.ascii_letters + string.digits) for _ in range(16))
    base["_id"]       = rid
    base["createdAt"] = {"$$date": now_ms}
    base["updatedAt"] = {"$$date": now_ms}

    # 3) apendear como nueva línea (sin tocar lo anterior)
    with open(path, "a", encoding="utf-8") as wf:
        wf.write(json.dumps(base, ensure_ascii=False, separators=(",", ":")) + "\n")

    # 4) snapshot de lo relevante
    updated_snapshot: Dict[str, Any] = {k: base.get(k) for k in ALLOWED_KEYS.keys()}
    updated_snapshot["dancerName"] = base.get("dancerName")
    updated_snapshot["__refid"] = base.get("__refid")
    updated_snapshot["ddrCode"] = base.get("ddrCode")
    return updated_snapshot



def read_profile3_fields(linked: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Devuelve un snapshot de la ÚLTIMA línea profile3 del usuario (solo core + IDs).
    """
    path = settings.NDJSON_PATH
    if not os.path.exists(path):
        return None

    last_obj = None
    with open(path, "r", encoding="utf-8") as rf:
        for line in rf:
            s = line.strip()
            if not s:
                continue
            try:
                obj = json.loads(s)
            except Exception:
                continue
            if _match_profile(obj, linked):
                last_obj = obj

    if not last_obj:
        return None

    # purgar customize solo para el snapshot (por prolijidad)
    for bad in list(CUSTOM_KEYS):
        if bad in last_obj:
            last_obj.pop(bad, None)

    snap = {k: last_obj.get(k) for k in ALLOWED_KEYS.keys()}
    snap["dancerName"] = last_obj.get("dancerName")
    snap["__refid"] = last_obj.get("__refid")
    snap["ddrCode"] = last_obj.get("ddrCode")
    return snap
