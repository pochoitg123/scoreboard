from fastapi import APIRouter, Query
from typing import Dict, Any, List, Optional
from app.services.cache import cache

router = APIRouter(prefix="/songs", tags=["songs"])

@router.get("", response_model=List[Dict[str, Any]])
def list_songs(q: Optional[str] = Query(None)):
    cache.load_if_changed()
    items = []
    for k, v in cache.songs_dict.items():
        name = (v.get("name") or v.get("title") or k)
        artist = v.get("artist", "")
        if q:
            ql = q.lower()
            if ql not in str(name).lower() and ql not in str(artist).lower():
                continue
        items.append({"id": k, **v})
    items.sort(key=lambda x: str(x.get("name", "")))
    return items
