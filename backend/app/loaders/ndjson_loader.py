import json
from typing import Iterable, Dict, Any

def iter_ndjson(path: str) -> Iterable[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line: 
                continue
            yield json.loads(line)

def normalize_date(d):
    if isinstance(d, dict) and "$$date" in d:
        import datetime as dt
        ms = int(d["$$date"])
        return dt.datetime.utcfromtimestamp(ms / 1000).isoformat() + "Z"
    return d
