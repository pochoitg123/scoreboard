# app/api/routers/scores.py
from __future__ import annotations
from fastapi import APIRouter, Query
from typing import Any, Dict, List, Optional, Union
from app.services.cache import cache

router = APIRouter(prefix="/scores", tags=["scores"])


def _mode_from_style(style: Optional[int]) -> str:
    # 0/None => Single, 1 => Double
    return "D" if style == 1 else "S"


@router.get("")
def list_scores(
    limit: int = Query(200, ge=1, le=5000),
    dancer: Optional[str] = None,
    source: str = Query("score3", pattern="^(score3|hiscore3)$"),
) -> List[Dict[str, Any]]:
    """
    Devuelve scores enriquecidos con songMeta (incluye basename) y dancerName
    recuperado desde profile3 cuando el score no lo trae.
    """
    cache.load_if_changed()
    raw = cache.hiscores if source == "hiscore3" else cache.scores

    out: List[Dict[str, Any]] = []
    for s in raw:
        # Nombre del jugador: del score o del profile3
        dn = cache.dancer_name_for(s) or "UNKNOWN"
        if dancer and dn != dancer:
            continue

        song_id = s.get("songId")

        row: Dict[str, Any] = {
            "source": source,
            "songId": song_id,
            "style": s.get("style"),
            "mode": _mode_from_style(s.get("style")),
            "difficulty": s.get("difficulty"),
            "dancerName": dn,
            "score": s.get("score"),
            "clearKind": s.get("clearKind"),
            "exScore": s.get("exScore"),
            "maxCombo": s.get("maxCombo"),
            "rank": s.get("rank"),
            "createdAt": s.get("createdAt"),
            "updatedAt": s.get("updatedAt"),
        }

        meta = cache.song_meta(song_id)
        if meta:
            row["songMeta"] = {
                "title": meta.get("title"),
                "name": meta.get("name") or meta.get("title"),
                "basename": meta.get("basename"),
                "series": meta.get("series"),
                "bpm": meta.get("bpm"),
                "diffLv": meta.get("diffLv"),
            }
        else:
            row["songMeta"] = None

        out.append(row)
        if len(out) >= limit:
            break

    out.sort(key=lambda r: r.get("score") or 0, reverse=True)
    return out


@router.get("/ranking")
def song_ranking(
    songId: Union[int, str],
    source: str = Query("score3", pattern="^(score3|hiscore3)$"),
    limit: int = Query(5, ge=1, le=50),
) -> Dict[str, Any]:
    """
    Ranking por canción: TOP N Single y TOP N Double.
    Para cada jugador conserva su MEJOR score por modo en esa canción.
    """
    cache.load_if_changed()
    raw = cache.hiscores if source == "hiscore3" else cache.scores

    def _same_song(v: Any) -> bool:
        return str(v) == str(songId)

    # agrupa mejor score por (modo, jugador)
    best_by_player: Dict[str, Dict[str, Any]] = {}   # clave: "S|dancer", "D|dancer"

    for s in raw:
        if not _same_song(s.get("songId")):
            continue

        mode = _mode_from_style(s.get("style"))
        dn = cache.dancer_name_for(s) or "UNKNOWN"
        key = f"{mode}|{dn}"

        cur_score = s.get("score") or 0
        prev = best_by_player.get(key)
        if not prev or (cur_score > (prev.get("score") or 0)):
            best_by_player[key] = {
                "mode": mode,
                "dancerName": dn,
                "score": cur_score,
                "clearKind": s.get("clearKind"),
                "rank": s.get("rank"),
                "difficulty": s.get("difficulty"),
            }

    # separa y ordena
    single = [v for k, v in best_by_player.items() if k.startswith("S|")]
    double = [v for k, v in best_by_player.items() if k.startswith("D|")]
    single.sort(key=lambda r: r.get("score") or 0, reverse=True)
    double.sort(key=lambda r: r.get("score") or 0, reverse=True)

    single = single[:limit]
    double = double[:limit]

    meta = cache.song_meta(songId) or {}
    song_meta = {
        "title": meta.get("title") or meta.get("name"),
        "basename": meta.get("basename"),
        "series": meta.get("series"),
        "bpm": meta.get("bpm"),
        "diffLv": meta.get("diffLv"),
    }

    return {
        "songId": songId,
        "songMeta": song_meta,
        "single": single,
        "double": double,
    }
