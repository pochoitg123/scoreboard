import React, { useEffect, useMemo, useState } from "react";
import type { ScoreRow } from "../api/client";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as PieTooltip,
} from "recharts";
import { fetchSongRanking, type SongRankingResponse } from "../api/client";
import RankingModal from "./RankingModal";
import {
  Icon,
  clearIconNames,
  rankIconNames,
  getRankLabel,
  getClearLabel,
} from "../utils/icons";

/* ========================= Tipos ========================= */
type SongDictEntry = {
  mcode: number | string;
  title?: string;
  basename?: string;
  diffLv?: number[];
  series?: number;
};

type LoaderDebug = {
  okUrl?: string | null;
  tried: { url: string; ok: boolean; status?: number; error?: string }[];
  note?: string;
  parsed?: number;
};

/* ========================= Utils ========================= */
function toNumId(v: any): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d+$/.test(v)) return parseInt(v, 10);
  return undefined;
}
const normTitleKey = (s?: string | null) =>
  s ? s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim() : "";

function getSongTitle(s: ScoreRow): string {
  return (
    (s.songMeta as any)?.title ||
    (s.songMeta as any)?.name ||
    String((s as any).songId ?? "Song")
  );
}
function getMode(s: ScoreRow): "S" | "D" {
  return String((s as any).mode || "S").toUpperCase() === "D" ? "D" : "S";
}
function diffLabel(mode?: string | null, difficulty?: number | null) {
  const m = (String(mode || "S").toUpperCase() === "D") ? "D" : "S";
  switch (difficulty ?? -1) {
    case 0:  return { abbr: m === "S" ? "SP" : "DP", name: "Simple" };
    case 1:  return { abbr: m === "S" ? "BSP" : "BDP", name: "Basic" };
    case 2:  return { abbr: m === "S" ? "DSP" : "DDP", name: "Difficult" };
    case 3:  return { abbr: m === "S" ? "ESP" : "EDP", name: "Expert" };
    case 4:  return { abbr: m === "S" ? "CSP" : "CDP", name: "Challenge" };
    default: return { abbr: "??", name: "Unknown" };
  }
}
function levelFrom(s: ScoreRow): number | null {
  const meta: any = s.songMeta || {};
  const lv: number[] | undefined = Array.isArray(meta?.diffLv) ? meta.diffLv : undefined;
  if (!lv) return null;
  const base = getMode(s) === "D" ? 5 : 0;
  const d = ((s as any).difficulty ?? 0) as number;
  const idx = base + d;
  const val = lv[idx] ?? 0;
  return val && val > 0 ? val : null;
}
function getDiffText(s: ScoreRow): string {
  const label = diffLabel((s as any).mode, (s as any).difficulty);
  const lv = levelFrom(s);
  return lv ? `${label.abbr}${lv}` : label.abbr;
}

/** Timestamp desde:
 *  - { "$$date": number }
 *  - number (ms o s)
 *  - string ISO
 */
function tsFromAny(v: any): number | null {
  if (!v) return null;
  if (typeof v === "object" && "$$date" in v) {
    const n = (v as any)["$$date"];
    return typeof n === "number" ? n : null;
  }
  if (typeof v === "number") return v > 1e12 ? v : Math.round(v * 1000);
  if (typeof v === "string") {
    const ts = Date.parse(v);
    if (!isNaN(ts)) return ts;
  }
  return null;
}
/** Usa max(createdAt, updatedAt) */
function getPlayedAt(s: ScoreRow): number | null {
  const a = tsFromAny((s as any).createdAt);
  const b = tsFromAny((s as any).updatedAt);
  if (a && b) return Math.max(a, b);
  return a ?? b ?? null;
}

function titleFromBasename(basename?: string | null): string | null {
  if (!basename) return null;
  const cleaned = String(basename).replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.split(" ").map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(" ");
}
function cleanSongTitle(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const s = raw.replace(/\s*(?:C?S?P|D?P)?\s*\d{1,2}\s*$/i, "").trim();
  return s || raw;
}
function iconSizeFrom(value: number, maxVal: number, minPx = 64, maxPx = 160) {
  if (maxVal <= 0) return minPx;
  const r = Math.max(0, Math.min(1, value / maxVal));
  const k = Math.sqrt(r);
  return Math.round(minPx + (maxPx - minPx) * k);
}

/* ========================= Carga de archivos (con debug) ========================= */
async function tryFetch(url: string): Promise<{ ok: boolean; text?: string; status?: number; error?: string }> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, text: (await res.text()), status: res.status };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
async function fetchTextFromCandidates(paths: string[], dbg: LoaderDebug): Promise<string | null> {
  for (const p of paths) {
    const u = p.includes("?") ? p : `${p}?t=${Date.now()}`; // cache buster
    const r = await tryFetch(u);
    dbg.tried.push({ url: u, ok: r.ok, status: r.status, error: r.error });
    if (r.ok && typeof r.text === "string") { dbg.okUrl = u; return r.text; }
  }
  return null;
}

async function loadSongsDict(dbg: LoaderDebug): Promise<SongDictEntry[]> {
  try {
    const raw = await fetchTextFromCandidates([
      "/data/songs.json",
      new URL("../data/songs.json", import.meta.url).toString(),
    ], dbg);
    if (!raw) { dbg.note = "songs.json no encontrado"; return []; }
    return JSON.parse(raw);
  } catch (e: any) {
    dbg.note = `songs.json parse error: ${String(e?.message || e)}`;
    return [];
  }
}

/** Extrae objetos JSON aunque el archivo no sea NDJSON perfecto:
 *  - Quita BOM y NUL
 *  - Si hay NDJSON, intenta parsear linea a linea (ignorando fallos)
 *  - Si no, recorre el texto y arma objetos balanceando {…} (respetando strings)
 */
function extractJsonObjectsLoose(rawIn: string): any[] {
  let raw = rawIn;
  if (!raw) return [];
  // quita BOM y NULs
  raw = raw.replace(/^\uFEFF/, "").replace(/\u0000/g, "");
  const out: any[] = [];

  // 1) Intento NDJSON directo
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length >= 1) {
    for (const ln of lines) {
      if (!ln.startsWith("{") || !ln.endsWith("}")) continue;
      try { out.push(JSON.parse(ln)); } catch {}
    }
    if (out.length) return out;
  }

  // 2) Intento separar pegados "}{"
  const sep = raw.replace(/}\s*{/g, "}\n{");
  if (sep !== raw) {
    const chunks = sep.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    for (const c of chunks) {
      if (!c.startsWith("{") || !c.endsWith("}")) continue;
      try { out.push(JSON.parse(c)); } catch {}
    }
    if (out.length) return out;
  }

  // 3) Escaneo balanceando llaves
  let depth = 0, inStr = false, esc = false, start = -1;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inStr) {
      if (esc) { esc = false; }
      else if (ch === "\\") { esc = true; }
      else if (ch === "\"") { inStr = false; }
      continue;
    }
    if (ch === "\"") { inStr = true; continue; }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      if (depth > 0) depth--;
      if (depth === 0 && start >= 0) {
        const frag = raw.slice(start, i + 1);
        try { out.push(JSON.parse(frag)); } catch {}
        start = -1;
      }
    }
  }
  return out;
}

/** Lee NDJSON si existe /data/log.ndjson, con fallback a /data/log.json. */
async function loadLogAny(dbg: LoaderDebug): Promise<any[]> {
  try {
    const rawIn = await fetchTextFromCandidates([
      // prioridad: NDJSON
      "/data/log.ndjson",
      new URL("../data/log.ndjson", import.meta.url).toString(),
      // fallback: JSON (array / objetos pegados)
      "/data/log.json",
      new URL("../data/log.json", import.meta.url).toString(),
    ], dbg);
    if (!rawIn) { dbg.note = "log.ndjson/log.json no encontrado"; return []; }

    // Normaliza texto
    const raw = rawIn.replace(/^\uFEFF/, "").replace(/\u0000/g, "");

    // 1) JSON array o { entries: [...] }
    try {
      const j = JSON.parse(raw);
      if (Array.isArray(j)) { dbg.parsed = j.length; return j; }
      if (j && Array.isArray((j as any).entries)) { dbg.parsed = (j as any).entries.length; return (j as any).entries; }
    } catch { /* sigue */ }

    // 2) Extraccion laxa (NDJSON, pegados, balanceo de llaves)
    const objs = extractJsonObjectsLoose(raw);
    if (objs.length) { dbg.parsed = objs.length; return objs; }

    // 3) Objeto unico como ultimo recurso
    try {
      const single = JSON.parse(raw);
      const arr = Array.isArray(single) ? single : [single];
      dbg.parsed = arr.length;
      return arr;
    } catch { /* nada */ }

    dbg.note = "log.ndjson/log.json sin formato reconocible";
    return [];
  } catch (e: any) {
    dbg.note = `log.ndjson/log.json error: ${String(e?.message || e)}`;
    return [];
  }
}

/* ========================= Props ========================= */
type Props = {
  scores: ScoreRow[];
  allScores?: ScoreRow[];
  loading?: boolean;
};

const TOP_N = 12;
const PIE_COLORS = [
  "#60a5fa", "#34d399", "#fbbf24", "#f472b6",
  "#a78bfa", "#f87171", "#22d3ee", "#c084fc",
];

/* ========================= Componente ========================= */
export default function ScoreDashboardCharts({ scores, allScores, loading }: Props) {
  // Diccionario songs.json -> Map<mcode, SongDictEntry>
  const [songsMap, setSongsMap] = useState<Map<number, SongDictEntry>>(new Map());
  const [byBasename, setByBasename] = useState<Map<string, SongDictEntry>>(new Map());
  const [byTitleKey, setByTitleKey] = useState<Map<string, SongDictEntry>>(new Map());

  // Log externo
  const [logRows, setLogRows] = useState<any[] | null>(null);

  // Debug loaders
  const [songsDbg, setSongsDbg] = useState<LoaderDebug>({ tried: [] });
  const [logDbg, setLogDbg] = useState<LoaderDebug>({ tried: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      const sDbg: LoaderDebug = { tried: [] };
      const lDbg: LoaderDebug = { tried: [] };

      const [dict, log] = await Promise.all([loadSongsDict(sDbg), loadLogAny(lDbg)]);
      if (!alive) return;

      // Map por mcode y auxiliares
      const map = new Map<number, SongDictEntry>();
      const bBase = new Map<string, SongDictEntry>();
      const tKey = new Map<string, SongDictEntry>();
      for (const e of dict) {
        const key = toNumId(e?.mcode);
        if (key === undefined) continue;
        map.set(key, e);
        if (e.basename) bBase.set(String(e.basename), e);
        if (e.title) tKey.set(normTitleKey(e.title), e);
      }

      setSongsMap(map);
      setByBasename(bBase);
      setByTitleKey(tKey);
      setLogRows(log);

      setSongsDbg(sDbg);
      setLogDbg(lDbg);
    })();
    return () => { alive = false; };
  }, []);

  // Normaliza filas del log
  const normalizedFromLog: ScoreRow[] = useMemo(() => {
    if (!Array.isArray(logRows) || logRows.length === 0) return [];
    return logRows.map((r: any) => {
      const idCandidates = [
        r?.songId, r?.mcode, r?.id, r?.songMeta?.mcode, r?.song?.mcode,
      ].map(toNumId).filter((x) => x !== undefined) as number[];

      let mcodeNum: number | undefined = idCandidates[0];

      const metaIn = r?.songMeta || {};
      const baseHint = metaIn?.basename ?? metaIn?.baseName ?? r?.basename;
      if (mcodeNum === undefined && baseHint && byBasename.has(String(baseHint))) {
        mcodeNum = byBasename.get(String(baseHint))!.mcode as number;
      }
      const titleHint = metaIn?.title ?? r?.title;
      if (mcodeNum === undefined && titleHint) {
        const key = normTitleKey(titleHint);
        if (key && byTitleKey.has(key)) mcodeNum = byTitleKey.get(key)!.mcode as number;
      }

      const dict = (mcodeNum !== undefined) ? songsMap.get(mcodeNum) : undefined;
      const titleDerivedFromBase = titleFromBasename(baseHint);
      const title =
        metaIn?.title ?? r?.title ?? dict?.title ?? titleDerivedFromBase ??
        (mcodeNum !== undefined ? `Song ${mcodeNum}` : "Song");

      const basename =
        metaIn?.basename ?? metaIn?.baseName ?? r?.basename ?? dict?.basename ??
        (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : undefined);

      const out: any = {
        songId: mcodeNum !== undefined ? mcodeNum : undefined,
        difficulty: r?.difficulty ?? 0,
        mode: (r?.mode ?? "S"),
        score: r?.score ?? undefined,
        rank: r?.rank ?? undefined,
        clearKind: r?.clearKind ?? undefined,
        createdAt: r?.createdAt ?? r?.updatedAt ?? undefined,
        updatedAt: r?.updatedAt ?? r?.createdAt ?? undefined,
        collection: r?.collection,
        dancerName: r?.dancerName ?? r?.player ?? undefined,
        songMeta: {
          ...metaIn,
          title: (/^Song\s*\d+$/i.test(String(title)) && dict?.title) ? dict.title! : title,
          basename,
          diffLv: (metaIn?.diffLv ?? dict?.diffLv) || undefined,
        },
      };
      return out as ScoreRow;
    });
  }, [logRows, songsMap, byBasename, byTitleKey]);

  // score3 u hiscore3 desde el log
  const LOG_COLLECTIONS = useMemo(() => new Set(["score3", "hiscore3"]), []);
  const baseFromLogScore3 = useMemo(
    () => normalizedFromLog.filter((r: any) => LOG_COLLECTIONS.has((r?.collection ?? "score3"))),
    [normalizedFromLog, LOG_COLLECTIONS]
  );

  /* ========================= Top ========================= */
  const topSongs = useMemo(() => {
    type Row = { key: string; name: string; value: number; img?: string | null; songId?: number };

    // Prioridad: log(score3/hiscore3) > allScores > scores
    const base =
      (baseFromLogScore3.length > 0 ? baseFromLogScore3
        : (Array.isArray(allScores) && allScores.length > 0) ? allScores
        : scores);

    const counts = new Map<string, { name: string; img?: string | null; n: number; songId?: number }>();
    for (const s of base) {
      const idNum = toNumId((s as any).songId);
      const dict = idNum !== undefined ? songsMap.get(idNum) : undefined;

      const scoreTitle = getSongTitle(s);
      const displayNameRaw =
        dict?.title ??
        (!/^Song\s*\d+$/i.test(scoreTitle) ? scoreTitle : undefined) ??
        (idNum !== undefined ? `Song ${idNum}` : "Song");
      const displayName = cleanSongTitle(displayNameRaw) || displayNameRaw;

      const baseForCover =
        dict?.basename ??
        (s as any)?.songMeta?.basename ??
        (displayName ? displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : undefined);
      const img = baseForCover ? `/songs/${baseForCover}.png` : null;

      const key = (idNum !== undefined) ? String(idNum) : displayName;
      const prev = counts.get(key);
      counts.set(key, { name: displayName, img, n: (prev?.n ?? 0) + 1, songId: idNum });
    }

    // Ponderacion n*(n+1)/2
    const rows: Row[] = [];
    for (const [key, { name, img, n, songId }] of counts) {
      const weight = (n * (n + 1)) / 2;
      rows.push({ key, name, value: weight, img, songId });
    }
    rows.sort((a, b) => (b.value - a.value) || a.name.localeCompare(b.name));
    return rows.slice(0, TOP_N);
  }, [scores, allScores, baseFromLogScore3, songsMap]);

  const maxVal = useMemo(
    () => topSongs.reduce((m, r) => Math.max(m, r.value), 0),
    [topSongs]
  );

  /* ========================= Pies de dificultad ========================= */
  const byDiffSingle = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of scores) {
      if (getMode(s) !== "S") continue;
      const label = getDiffText(s);
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [scores]);

  const byDiffDouble = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of scores) {
      if (getMode(s) !== "D") continue;
      const label = getDiffText(s);
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [scores]);

  /* ========================= Recientes ========================= */
  const recent = useMemo(() => {
    const copy = scores.map((s) => ({ ...(s as any), _ts: getPlayedAt(s) }));
    copy.sort((a, b) => (b._ts ?? 0) - (a._ts ?? 0));
    return copy.slice(0, 12);
  }, [scores]);

  /* ========================= Modal ranking ========================= */
  const [open, setOpen] = useState(false);
  const [selSong, setSelSong] = useState<{ songId: number | string; title: string; cover: string } | null>(null);
  const [ranking, setRanking] = useState<SongRankingResponse | null>(null);
  const [loadingRank, setLoadingRank] = useState(false);

  async function openRanking(s: ScoreRow) {
    const idNum = toNumId((s as any).songId);
    const dict = idNum !== undefined ? songsMap.get(idNum) : undefined;
    const cover = (dict?.basename ? `/songs/${dict.basename}.png` : null) || "/songs/_missing.png";

    setSelSong({ songId: (s as any).songId, title: getSongTitle(s), cover });
    setOpen(true);
    setLoadingRank(true);
    try {
      const src = ((s as any).collection === "hiscore3") ? "hiscore3" : "score3";
      const data = await fetchSongRanking((s as any).songId as any, { source: src as any, limit: 5 });
      setRanking(data);
    } finally {
      setLoadingRank(false);
    }
  }

  // Abrir ranking por songId directo (para los banners)
  async function openRankingBySongId(songId?: number, title?: string) {
    if (!songId) return;
    const dict = songsMap.get(songId);
    const cover = (dict?.basename ? `/songs/${dict.basename}.png` : null) || "/songs/_missing.png";

    setSelSong({ songId, title: title ?? dict?.title ?? `Song ${songId}`, cover });
    setOpen(true);
    setLoadingRank(true);
    try {
      let data = await fetchSongRanking(songId as any, { source: "score3" as any, limit: 5 });
      if (!data || (Array.isArray((data as any).ranking) && (data as any).ranking.length === 0)) {
        data = await fetchSongRanking(songId as any, { source: "hiscore3" as any, limit: 5 });
      }
      setRanking(data);
    } finally {
      setLoadingRank(false);
    }
  }

  /* ========================= Debug visible ========================= */
  const debugCounts = useMemo(() => {
    const n = baseFromLogScore3.length;
    const n187 = baseFromLogScore3.filter((r: any) => Number((r as any).songId) === 187).length;
    return { n, n187 };
  }, [baseFromLogScore3]);

  const debugNote = useMemo(() => {
    if (baseFromLogScore3.length > 0) {
      return `Fuente: ${logDbg.okUrl ? logDbg.okUrl : "log.ndjson"} • Leidas ${normalizedFromLog.length} • log(score3/hiscore3): ${baseFromLogScore3.length} • songId 187: ${debugCounts.n187}`;
    }
    if (Array.isArray(allScores) && allScores.length > 0) {
      return `Fuente: prop allScores (${allScores.length})`;
    }
    const parsedInfo = typeof logDbg.parsed === "number" ? ` • parsed=${logDbg.parsed}` : "";
    return `Fuente: prop scores (${scores.length})${parsedInfo}`;
  }, [normalizedFromLog.length, baseFromLogScore3.length, allScores, scores, debugCounts.n187, logDbg.okUrl, logDbg.parsed]);

  useEffect(() => {
    if (baseFromLogScore3.length) {
      const c187 = baseFromLogScore3.filter((r: any) => Number((r as any).songId) === 187).length;
      console.log("[TOP DEBUG] score3/hiscore3 rows =", baseFromLogScore3.length, " | songId 187 =", c187);
    } else {
      console.log("[TOP DEBUG] rows = 0 (¿no se esta leyendo /data/log.ndjson?)", logDbg);
    }
  }, [baseFromLogScore3, logDbg]);

  /* ========================= Render ========================= */
  return (
    <div className="section">
      {loading && <div>Cargando datos…</div>}

      <div className="card">
        <h3 className="h3">Canciones más jugadas (Top {TOP_N})</h3>

        <div
          className="image-cloud"
          style={{
            display: "flex", flexWrap: "wrap", gap: 16,
            alignItems: "flex-end", justifyContent: "center", padding: 8,
          }}
        >
          {topSongs.map((s, i) => {
            const size = iconSizeFrom(s.value, maxVal, 64, 160);
            const sid = s.songId ?? toNumId(s.key); // backup desde key si es numerico

            return (
              <div key={s.key ?? i} style={{ width: size }}>
                <div
                  role="button"
                  onClick={() => openRankingBySongId(sid, s.name)}
                  onKeyDown={(e) => { if (e.key === "Enter") openRankingBySongId(sid, s.name); }}
                  tabIndex={0}
                  title={`${s.name}`}
                  style={{
                    width: size, height: size, position: "relative",
                    borderRadius: 12, overflow: "hidden",
                    boxShadow: "0 6px 16px rgba(0,0,0,0.35)", background: "#0b1220",
                    cursor: sid ? "pointer" : "default",
                    outline: "none",
                  }}
                >
                  {s.img ? (
                    <img
                      src={s.img}
                      alt={s.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      draggable={false}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%", height: "100%", display: "grid", placeItems: "center",
                        background: "#0EA5E9", color: "#0b1220", fontWeight: 800,
                      }}
                    >
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Numero oculto: removido el badge con s.value */}
                </div>

                <div
                  title={s.name}
                  onClick={() => openRankingBySongId(sid, s.name)}
                  style={{
                    cursor: sid ? "pointer" : "default",
                    marginTop: 6,
                    maxWidth: size,
                    textAlign: "center",
                    fontSize: 12,
                    color: "#e5e7eb",
                    lineHeight: 1.15,
                    whiteSpace: "normal",
                  }}
                >
                  {s.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Debug: origen de datos */}
        <div style={{ textAlign: "center", opacity: .85, marginTop: 8, fontSize: 12 }}>
          {debugNote}
        </div>

        {/* Debug: intentos/errores al leer NDJSON/JSON */}
        {baseFromLogScore3.length === 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#93c5fd" }}>
            <div><strong>Diagnóstico log.ndjson</strong></div>
            <div>URL OK: {logDbg.okUrl ?? "(ninguna)"} {logDbg.note ? `• ${logDbg.note}` : ""} {typeof logDbg.parsed === "number" ? `• parsed=${logDbg.parsed}` : ""}</div>
            <div style={{ marginTop: 4 }}>
              Intentos:
              <ul style={{ margin: "4px 0 0 18px" }}>
                {logDbg.tried.map((t, idx) => (
                  <li key={idx}>
                    {t.ok ? "OK" : "FAIL"} — {t.url} {typeof t.status === "number" ? `(HTTP ${t.status})` : ""} {t.error ? `• ${t.error}` : ""}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ marginTop: 4 }}>
              <em>Coloca tu archivo en <code>public/data/log.ndjson</code> (o <code>public/data/log.json</code>) y refresca con Ctrl/Cmd + Shift + R.</em>
            </div>
          </div>
        )}
      </div>

      {/* Grid 2 columnas */}
      <div className="grid-2">
        <div className="stack">
          <div className="card">
            <h3 className="h3">Distribución por dificultad (Single)</h3>
            <div className="chart chart--lg">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byDiffSingle} dataKey="value" nameKey="label" outerRadius={110}>
                    {byDiffSingle.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <PieTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3 className="h3">Distribución por dificultad (Double)</h3>
            <div className="chart chart--lg">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byDiffDouble} dataKey="value" nameKey="label" outerRadius={110}>
                    {byDiffDouble.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <PieTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="h3">Jugadas recientemente</h3>
          <ul className="list">
            {recent.map((s: any, idx: number) => {
              const rankLbl = getRankLabel((s as any).rank);
              const clearLbl = getClearLabel(s.clearKind);
              return (
                <li
                  key={idx}
                  className="list-item"
                  onClick={() => openRanking(s)}
                  title="Ver ranking de la canción"
                  style={{ cursor: "pointer" }}
                >
                  <div className="title-wrap">
                    <div className="title">{getSongTitle(s)}</div>
                    <div className="meta">{getDiffText(s)}</div>
                  </div>

                  <div className="meta" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ marginRight: 4 }}>
                      {s._ts ? new Date(s._ts).toLocaleString() : "sin fecha"}
                    </span>
                    {s.dancerName && <span>• {s.dancerName}</span>}
                    {typeof s.score === "number" && (<span title="Score">• {s.score.toLocaleString()}</span>)}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span title={rankLbl} style={iconBadgeSm as React.CSSProperties}>
                        <Icon names={rankIconNames((s as any).rank)} size={14} />
                      </span>
                      <span title={clearLbl} style={iconBadgeSm as React.CSSProperties}>
                        <Icon names={clearIconNames(s.clearKind)} size={14} spin speedMs={900} />
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Modal Ranking */}
      <RankingModal
        open={open}
        onClose={() => setOpen(false)}
        song={selSong}
        ranking={ranking}
        loading={loadingRank}
      />

      {/* estilos rapidos */}
      <style>{`
        .h3 { margin: 0 0 8px; }
        .card { background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 16px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
        .stack { display: flex; flex-direction: column; gap: 16px; }
        .chart { width: 100%; height: 300px; }
        .list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
        .list-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 12px; background: #0b1220; border: 1px solid #1f2937; }
        .title-wrap { display: flex; align-items: baseline; gap: 8px; }
        .title { font-weight: 700; }
        .meta { opacity: .85; font-size: 12px; }
        @media (max-width: 900px) {
          .grid-2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

/* badge para iconos */
const iconBadgeSm: React.CSSProperties = {
  width: 22,
  height: 22,
  display: "grid",
  placeItems: "center",
  borderRadius: 6,
  border: "1px solid #334155",
  background: "#0b1220",
};
