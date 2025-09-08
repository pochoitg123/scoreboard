# app/api/routers/stats.py
from __future__ import annotations
from fastapi import APIRouter
from typing import Any, Dict, List
from app.services.cache import cache

router = APIRouter(prefix="/stats", tags=["stats"])

# Índices de clearKind relevantes
CK_FC, CK_GFC, CK_PFC, CK_MFC = 7, 8, 9, 10
RANK_AAA_IDX = 0  # "AAA" en tu array de ranks


@router.get("/dancers")
def dancers_summary() -> Dict[str, Any]:
    """
    Agrega por jugador: total, AAA por rank, y FC/GFC/PFC/MFC por clearKind.
    Usa score3 (juegos registrados), pero puedes cambiar a hiscore3 si quieres.
    """
    cache.load_if_changed()
    agg: Dict[str, Dict[str, int]] = {}

    for s in cache.scores:  # usar cache.hiscores si prefieres hiscore3
        name = cache.dancer_name_for(s) or "UNKNOWN"

        a = agg.get(name)
        if not a:
            a = {"total": 0, "AAA": 0, "FC": 0, "GFC": 0, "PFC": 0, "MFC": 0}
            agg[name] = a

        a["total"] += 1

        # rank
        r = s.get("rank")
        if isinstance(r, int) and r == RANK_AAA_IDX:
            a["AAA"] += 1

        # clearKind
        ck = s.get("clearKind")
        if ck == CK_FC:
            a["FC"] += 1
        elif ck == CK_GFC:
            a["GFC"] += 1
        elif ck == CK_PFC:
            a["PFC"] += 1
        elif ck == CK_MFC:
            a["MFC"] += 1

    # Serializa a lista ordenada (AAA desc, luego total desc)
    rows: List[Dict[str, Any]] = [
        {"dancerName": name, **vals} for name, vals in agg.items()
    ]
    rows.sort(key=lambda x: (x["AAA"], x["total"]), reverse=True)

    return {
        "total_dancers": len(rows),
        "rows": rows,
    }
