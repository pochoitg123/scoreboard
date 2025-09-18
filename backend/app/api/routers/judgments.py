# app/api/routers/judgments.py
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Dict, Optional
from collections import Counter
import json

from app.core.config import settings  # usa NDJSON_PATH de tu config

router = APIRouter(prefix="/api/stats", tags=["stats"])

JUDGE_KEYS = ("marvelous", "perfect", "great", "good", "bad", "miss")

def parse_ghost(ghost: str) -> Dict[str, int]:
    c = Counter((ghost or "").strip())
    return {
        "marvelous": c.get("0", 0),
        "perfect":   c.get("1", 0),
        "great":     c.get("2", 0),
        "good":      c.get("3", 0),
        "bad":       c.get("4", 0),
        "miss":      c.get("5", 0),
        "other":     sum(v for k, v in c.items() if k not in "012345"),
        "total":     sum(c.get(k, 0) for k in "012345"),
    }

class PlayerJudgmentTotals(BaseModel):
    refid: str
    name: Optional[str] = None
    songs: int
    marvelous: int
    perfect: int
    great: int
    good: int
    bad: int
    miss: int
    total_notes: int
    other: int

class GlobalJudgmentTotals(BaseModel):
    songs: int
    marvelous: int
    perfect: int
    great: int
    good: int
    bad: int
    miss: int
    total_notes: int
    other: int

class JudgmentStatsResponse(BaseModel):
    global_: GlobalJudgmentTotals
    players: list[PlayerJudgmentTotals]

@router.get("/judgments", response_model=JudgmentStatsResponse)
def get_judgment_stats(refid: Optional[str] = Query(default=None, description="Filtrar por __refid")):
    per_refid: Dict[str, Counter] = {}
    ghost_seen_global = set()
    ghost_seen_by_refid: Dict[str, set] = {}
    global_acc = Counter()
    global_other = 0

    # tabla de nombres por refid (desde profile3)
    names_by_refid: Dict[str, str] = {}

    with open(settings.NDJSON_PATH, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            try:
                obj = json.loads(line)
            except Exception:
                continue

            coll = obj.get("collection")

            # recoger nombres desde profile3
            if coll == "profile3":
                rf = obj.get("__refid")
                nm = obj.get("dancerName")
                if rf and nm and not names_by_refid.get(rf):
                    names_by_refid[rf] = str(nm)
                continue  # seguimos leyendo; el agregado es sobre ghost3

            if coll != "ghost3":
                continue

            if refid and obj.get("__refid") != refid:
                continue

            r = obj.get("__refid") or "unknown"
            gid = obj.get("ghostId")
            parsed = parse_ghost(obj.get("ghost", ""))

            acc = per_refid.setdefault(r, Counter())
            for k in JUDGE_KEYS:
                acc[k] += parsed[k]
            acc["total_notes"] += parsed["total"]
            acc["other"] += parsed["other"]

            if gid is not None:
                ghost_seen_by_refid.setdefault(r, set()).add(gid)
                ghost_seen_global.add(gid)

            for k in JUDGE_KEYS:
                global_acc[k] += parsed[k]
            global_acc["total_notes"] += parsed["total"]
            global_other += parsed["other"]

    players = []
    for r, acc in per_refid.items():
        players.append(PlayerJudgmentTotals(
            refid=r,
            name=names_by_refid.get(r),  # ← ahora usamos dancerName real
            songs=len(ghost_seen_by_refid.get(r, set())),
            marvelous=acc.get("marvelous", 0),
            perfect=acc.get("perfect", 0),
            great=acc.get("great", 0),
            good=acc.get("good", 0),
            bad=acc.get("bad", 0),
            miss=acc.get("miss", 0),
            total_notes=acc.get("total_notes", 0),
            other=acc.get("other", 0),
        ))

    players.sort(key=lambda p: (-(p.marvelous + p.perfect), -p.songs, p.refid))

    global_block = GlobalJudgmentTotals(
        songs=len(ghost_seen_global),
        marvelous=global_acc.get("marvelous", 0),
        perfect=global_acc.get("perfect", 0),
        great=global_acc.get("great", 0),
        good=global_acc.get("good", 0),
        bad=global_acc.get("bad", 0),
        miss=global_acc.get("miss", 0),
        total_notes=global_acc.get("total_notes", 0),
        other=global_other,
    )

    return JudgmentStatsResponse(global_=global_block, players=players)
