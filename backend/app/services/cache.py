# app/services/cache.py
from __future__ import annotations
import json
import os
from typing import Any, Dict, List, Optional, Union
from app.core.config import settings

Json = Dict[str, Any]
Key = Union[int, str]


class Cache:
    def __init__(self) -> None:
        # Índices de canciones
        self.songs_by_mcode: Dict[Key, Json] = {}

        # Datos crudos del NDJSON
        self.scores: List[Json] = []    # score3
        self.hiscores: List[Json] = []  # hiscore3

        # Índices de perfiles para recuperar dancerName
        self.profiles_by_refid: Dict[str, Json] = {}
        self.profiles_by_pcbid: Dict[str, Json] = {}

        # mtimes para recarga condicional
        self._songs_mtime: Optional[float] = None
        self._ndjson_mtime: Optional[float] = None

    # ---------- API pública ----------
    def force_reload(self) -> None:
        """Recarga todo sin mirar mtimes."""
        self._load_songs()
        self._load_ndjson()
        self._songs_mtime = self._safe_mtime(settings.SONGS_DICT_PATH)
        self._ndjson_mtime = self._safe_mtime(settings.NDJSON_PATH)

    def load_if_changed(self) -> None:
        """Recarga solo si cambió alguno de los archivos en disco."""
        cur_songs_m = self._safe_mtime(settings.SONGS_DICT_PATH)
        cur_ndjson_m = self._safe_mtime(settings.NDJSON_PATH)

        if self._songs_mtime is None or (cur_songs_m is not None and cur_songs_m != self._songs_mtime):
            self._load_songs()
            self._songs_mtime = cur_songs_m

        if self._ndjson_mtime is None or (cur_ndjson_m is not None and cur_ndjson_m != self._ndjson_mtime):
            self._load_ndjson()
            self._ndjson_mtime = cur_ndjson_m

    def song_meta(self, song_id: Key) -> Optional[Json]:
        """Metadata del songs.json para el mcode/songId dado (acepta int o str)."""
        if song_id in self.songs_by_mcode:
            return self.songs_by_mcode[song_id]
        try:
            return self.songs_by_mcode[int(song_id)]  # type: ignore[arg-type]
        except Exception:
            return self.songs_by_mcode.get(str(song_id))

    def dancer_name_for(self, obj: Json) -> Optional[str]:
        """
        Recupera dancerName para un score/hiscore:
        1) Usa el que venga en el objeto si existe
        2) Busca por __refid en profile3
        3) Busca por pcbid en profile3
        """
        name = obj.get("dancerName")
        if isinstance(name, str) and name.strip():
            return name

        refid = obj.get("__refid") or obj.get("refid")
        if isinstance(refid, str):
            prof = self.profiles_by_refid.get(refid)
            if prof:
                n = prof.get("dancerName")
                if isinstance(n, str) and n.strip():
                    return n

        pcbid = obj.get("pcbid")
        if isinstance(pcbid, str):
            prof = self.profiles_by_pcbid.get(pcbid)
            if prof:
                n = prof.get("dancerName")
                if isinstance(n, str) and n.strip():
                    return n

        return None

    # ---------- util ----------
    def _safe_mtime(self, path: str) -> Optional[float]:
        try:
            return os.path.getmtime(path)
        except Exception:
            return None

    # ---------- Carga de datos ----------
    def _load_songs(self) -> None:
        """
        Carga songs.json como lista o dict. Indexa por int y str.
        Normaliza 'name' desde 'title'.
        """
        by: Dict[Key, Json] = {}

        with open(settings.SONGS_DICT_PATH, "r", encoding="utf-8") as f:
            raw = json.load(f)

        if isinstance(raw, list):
            for it in raw:
                if not isinstance(it, dict):
                    continue
                mcode = it.get("mcode")
                if mcode is None:
                    continue
                if "name" not in it and "title" in it:
                    it["name"] = it["title"]
                by[mcode] = it
                by[str(mcode)] = it
        elif isinstance(raw, dict):
            for k, v in raw.items():
                if not isinstance(v, dict):
                    continue
                if "name" not in v and "title" in v:
                    v["name"] = v["title"]
                by[k] = v
                try:
                    by[int(k)] = v
                except Exception:
                    pass

        self.songs_by_mcode = by

    def _load_ndjson(self) -> None:
        """
        Lee NDJSON (un JSON por línea) y separa score3 / hiscore3.
        Indexa también perfiles para dancerName por __refid/pcbid.
        """
        scores: List[Json] = []
        his: List[Json] = []
        by_refid: Dict[str, Json] = {}
        by_pcbid: Dict[str, Json] = {}

        with open(settings.NDJSON_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue

                col = obj.get("collection")
                if col == "score3":
                    scores.append(obj)
                elif col == "hiscore3":
                    his.append(obj)
                elif col == "profile3":
                    refid = obj.get("__refid") or obj.get("refid")
                    if isinstance(refid, str):
                        by_refid[refid] = obj
                    pcbid = obj.get("pcbid")
                    if isinstance(pcbid, str):
                        by_pcbid[pcbid] = obj

        self.scores = scores
        self.hiscores = his
        self.profiles_by_refid = by_refid
        self.profiles_by_pcbid = by_pcbid


# instancia global
cache = Cache()

