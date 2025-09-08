from __future__ import annotations
import json, os, tempfile, shutil, time, random, string
from typing import Any, Dict, Tuple, List, Optional
from collections import OrderedDict
from app.core.config import settings

COLL = "customize3"

# Pares que usa tu UI y que debemos garantizar (todas se crean con key=1)
DEFAULT_PAIRS: List[Tuple[int,int]] = [
    (1,1),  # Appeal
    (2,1),  # Character P1
    (2,2),  # Character P2
    (3,1),  # Game BG System
    (3,2),  # Game BG Play
    (4,1),  # Lane BG SINGLE
    (5,1),  # Lane BG DOUBLE
    (6,1),  # Lane Cover SINGLE
    (7,1),  # Lane Cover DOUBLE
    (8,1),  # Song Video
]

def _match_owner(obj: Dict[str, Any], linked: Dict[str, Any]) -> bool:
    if obj.get("collection") != COLL:
        return False
    refid = (linked.get("__refid") or "").strip()
    return bool(refid and (obj.get("__refid") or "").strip() == refid)

def read_customize(linked: Dict[str, Any]) -> Dict[Tuple[int,int], int]:
    """
    Devuelve {(category, pattern): key} de las ÚLTIMAS customize3 del jugador.
    """
    path = settings.NDJSON_PATH
    out: Dict[Tuple[int,int], int] = {}
    if not os.path.exists(path):
        return out

    last: Dict[Tuple[int,int], Dict[str, Any]] = {}
    with open(path, "r", encoding="utf-8") as rf:
        for line in rf:
            s = line.strip()
            if not s:
                continue
            try:
                obj = json.loads(s)
            except Exception:
                continue
            if not _match_owner(obj, linked) or obj.get("collection") != COLL:
                continue
            cat = int(obj.get("category", -1))
            pat = int(obj.get("pattern", 0))
            last[(cat, pat)] = obj

    for k, obj in last.items():
        out[k] = int(obj.get("key", 0)) or 1  # normaliza 0 -> 1
    return out

def _rnd_id(n: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(random.choice(alphabet) for _ in range(n))

def _norm_key(k: Any) -> int:
    try:
        v = int(k)
    except Exception:
        v = 1
    return 1 if v < 1 else v

def update_customize(linked: Dict[str, Any], changes: Dict[Tuple[int,int], int]) -> Dict[Tuple[int,int], int]:
    """
    APPEND-ONLY por (collection='customize3', __refid, category, pattern):
      - Siempre agrega una NUEVA línea por cada cambio con timestamps actuales,
        sin modificar registros previos (se preserva historial).
      - 'read_customize' ya toma la última ocurrencia como vigente, por lo que
        verás el cambio de inmediato.
    """
    import time, json, os, tempfile, shutil, random, string
    from collections import OrderedDict
    path = settings.NDJSON_PATH
    if not os.path.exists(path):
        return {}

    refid = (linked.get("__refid") or "").strip()
    if not refid:
        return {}

    now_ms = int(time.time() * 1000)

    # Normalizador local (>=1)
    def _norm_key(v: Any) -> int:
        try:
            n = int(v)
        except Exception:
            n = 1
        return 1 if n < 1 else n

    updated: Dict[Tuple[int,int], int] = {}

    # 1) Leer todas las líneas (solo para re-escribir igual; no modificamos nada existente)
    with open(path, "r", encoding="utf-8") as rf:
        lines = rf.readlines()

    # 2) Escribir todo tal cual + APÉNDICE con nuevas customize3
    with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8", dir=os.path.dirname(path)) as wf:
        tmp_path = wf.name

        # reescribe sin tocar nada
        for line in lines:
            wf.write(line)

        # apendea NUEVOS objetos por cada cambio
        for (cat, pat), new_key in changes.items():
            new_obj = OrderedDict()
            new_obj["collection"] = "customize3"
            new_obj["category"]  = int(cat)
            new_obj["pattern"]   = int(pat)
            new_obj["__s"]       = "plugins_profile"
            new_obj["__refid"]   = refid
            new_obj["key"]       = _norm_key(new_key)

            rid = "".join(random.choice(string.ascii_letters + string.digits) for _ in range(16))
            new_obj["_id"]       = rid
            new_obj["createdAt"] = {"$$date": now_ms}
            new_obj["updatedAt"] = {"$$date": now_ms}

            wf.write(json.dumps(new_obj, ensure_ascii=False, separators=(",", ":")) + "\n")
            updated[(int(cat), int(pat))] = int(new_obj["key"])

    shutil.move(tmp_path, path)
    return updated
