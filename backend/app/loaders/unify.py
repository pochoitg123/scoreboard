from typing import Any, Dict, Iterable, List, Optional
from .ndjson_loader import normalize_date

def map_style_label(style: Optional[int]) -> Optional[str]:
    if style is None:
        return None
    return "S" if style == 0 else "D" if style == 1 else str(style)

def _to_int_or_none(v) -> Optional[int]:
    try:
        return int(v) if v is not None else None
    except Exception:
        return None

def _norm_name(x: Optional[str]) -> Optional[str]:
    if x is None:
        return None
    n = str(x).strip()
    return n if n else None

def unify_records(raw_docs: Iterable[Dict[str, Any]], songs_dict: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Unifica documentos tomando **solo score3**, dedup fuerte y
    RELLENA dancerName desde profile3 por __refid/pcbid si falta.
    """
    raw_docs = list(raw_docs)  # lo toco más de una vez

    # --- 1) Index de perfiles para fallback de nombres ---
    by_refid: Dict[str, str] = {}
    by_pcbid: Dict[str, str] = {}
    for doc in raw_docs:
        if doc.get("collection") in ("profile3", "profile"):
            refid = _norm_name(doc.get("__refid"))
            pcbid = _norm_name(doc.get("pcbid"))
            pname = _norm_name(doc.get("dancerName")) or _norm_name(doc.get("player")) or _norm_name(doc.get("name"))
            if pname:
                if refid and refid not in by_refid:
                    by_refid[refid] = pname
                if pcbid and pcbid not in by_pcbid:
                    by_pcbid[pcbid] = pname

    # --- 2) Unificar solo score3 ---
    scores: List[Dict[str, Any]] = []
    for doc in raw_docs:
        if doc.get("collection") != "score3":
            continue

        song_id = doc.get("songId")
        style = _to_int_or_none(doc.get("style"))
        difficulty = _to_int_or_none(doc.get("difficulty"))

        # Nombre del jugador con fallbacks
        dancer = _norm_name(doc.get("dancerName")) or _norm_name(doc.get("player"))
        if not dancer:
            refid = _norm_name(doc.get("__refid"))
            pcbid = _norm_name(doc.get("pcbid"))
            dancer = (by_refid.get(refid) if refid else None) or (by_pcbid.get(pcbid) if pcbid else None) or "UNKNOWN"

        base = {
            "source": "score3",
            "songId": song_id,
            "style": style,
            "mode": map_style_label(style),   # "S" | "D"
            "difficulty": difficulty,         # 0..4
            "dancerName": dancer,
            "score": doc.get("score"),
            "rank": _to_int_or_none(doc.get("rank")),            # para AAA
            "clearKind": _to_int_or_none(doc.get("clearKind")),  # 7 FC, 8 GFC, 9 PFC, 10 MFC
            "exScore": doc.get("exScore"),
            "maxCombo": doc.get("maxCombo"),
            "country": doc.get("country"),
            "region": doc.get("region"),
            "createdAt": normalize_date(doc.get("createdAt")),
            "updatedAt": normalize_date(doc.get("updatedAt")),
            "raw": doc,
        }

        key = str(song_id) if song_id is not None else None
        meta = songs_dict.get(key, {})

        image_basename = (
            meta.get("imageBasename")
            or meta.get("image_basename")
            or meta.get("basename")
            or meta.get("image")
            or meta.get("cover")
            or None
        )

        base["songMeta"] = {
            "name": meta.get("name") or meta.get("title") or key,
            "artist": meta.get("artist", ""),
            "series": meta.get("series", ""),
            "bpm": meta.get("bpm"),
            "imageUrl": meta.get("imageUrl") or meta.get("image_url"),
            "imageBasename": image_basename,
            "levelInfo": meta.get("levelInfo") or meta.get("diffLv"),
        }

        base["grade"] = infer_grade(base)
        scores.append(base)

    # --- 3) Orden y dedup ---
    def sort_key(x):
        return (x.get("score") or 0, x.get("createdAt") or "")
    scores.sort(key=sort_key, reverse=True)

    dedup: List[Dict[str, Any]] = []
    seen_primary = set()
    seen_fallback = set()
    seen_same_score = set()

    for s in scores:
        song_id = s.get("songId")
        mode = s.get("mode")
        diff = s.get("difficulty")
        dancer = s.get("dancerName")
        sc = s.get("score")

        key_primary = (song_id, mode, diff, dancer) if diff is not None else None
        key_fallback = (song_id, mode, dancer)
        key_same_score = (song_id, dancer, sc)

        if key_primary and key_primary in seen_primary:
            continue
        if (key_primary is None) and (key_fallback in seen_fallback):
            continue
        if key_same_score in seen_same_score:
            continue

        if key_primary:
            seen_primary.add(key_primary)
        else:
            seen_fallback.add(key_fallback)
        seen_same_score.add(key_same_score)

        dedup.append(s)

    return dedup

def infer_grade(score_row: Dict[str, Any]) -> Optional[str]:
    return None
