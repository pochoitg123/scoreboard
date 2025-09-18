// frontend/src/components/DancersHome.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchDancersSummary,
  fetchScores,
  type DancerSummaryRow,
  type ScoreRow,
} from "../api/client";

import "./DancersHome.css";

/* ================== Tipos ================== */
type SongRow = {
  mcode: number;
  series: number;
  title?: string;
  basename?: string;
  diffLv?: number[];
};

type Tier = "gold" | "green" | "blue" | "none";

type View =
  | "BSP" | "DSP" | "ESP" | "CSP" | "SP"
  | "BDP" | "DDP" | "EDP" | "CDP" | "DP";

type Badge = {
  series: number;
  tier: Tier;
  done: number;
  total: number;
  missing: string[];
  completed: string[];
  started: boolean;
  gfcButNoPfc?: string[];
};

/* ================== Utilidades ================== */
async function loadSongs(): Promise<SongRow[]> {
  try {
    const mod: any = await import("../data/songslogros.json");
    const data = (mod?.default ?? mod) as SongRow[];
    if (Array.isArray(data) && data.length) return data;
  } catch {}
  try {
    const r = await fetch("/songs.json", { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = (await r.json()) as SongRow[];
    if (Array.isArray(data)) return data;
  } catch {}
  return [];
}

function isDoubleView(view: View): boolean {
  return ["BDP", "DDP", "EDP", "CDP", "DP"].includes(view);
}

function diffIndexFor(view: View): number | null {
  switch (view) {
    case "BSP": return 1;
    case "DSP": return 2;
    case "ESP": return 3;
    case "CSP": return 4;
    case "SP":  return null;
    case "BDP": return 6;
    case "DDP": return 7;
    case "EDP": return 8;
    case "CDP": return 9;
    case "DP":  return null;
  }
}

function songHasChartForView(s: SongRow, view: View): boolean {
  const idx = diffIndexFor(view);
  if (!Array.isArray(s.diffLv)) return false;
  if (idx !== null) {
    return s.diffLv.length > idx && typeof s.diffLv[idx] === "number" && s.diffLv[idx] > 0;
  }
  const [from, to] = isDoubleView(view) ? [5, 9] : [0, 4];
  for (let i = from; i <= to; i++) {
    if (typeof s.diffLv[i] === "number" && s.diffLv[i] > 0) return true;
  }
  return false;
}

function buildSeriesMapForView(songs: SongRow[], view: View): Map<number, SongRow[]> {
  const map = new Map<number, SongRow[]>();
  for (const s of songs) {
    if (!songHasChartForView(s, view)) continue;
    if (!map.has(s.series)) map.set(s.series, []);
    map.get(s.series)!.push(s);
  }
  return map;
}

function allowedDiffs(view: View): number[] {
  if (view === "SP") return [0, 1, 2, 3, 4];
  if (view === "DP") return [5, 6, 7, 8, 9];
  switch (view) {
    case "BSP": return [1];
    case "DSP": return [2];
    case "ESP": return [3];
    case "CSP": return [4];
    case "BDP": return [6];
    case "DDP": return [7];
    case "EDP": return [8];
    case "CDP": return [9];
  }
}

function bestClearByMcode(scores: ScoreRow[], view: View): Map<number, number> {
  const best = new Map<number, number>();
  const allow = new Set(allowedDiffs(view));
  const wantDouble = isDoubleView(view);

  for (const row of scores) {
    const mcode = Number((row as any).songId ?? (row as any).mcode);
    const ck = Number((row as any).clearKind ?? -1);
    const mode = String((row as any).mode ?? "").toUpperCase();
    const style = Number((row as any).style ?? -1);
    const diff = Number((row as any).difficulty ?? -1);
    if (!Number.isFinite(mcode)) continue;

    const isSingle = mode === "S" || style === 0;
    const isDouble = mode === "D" || style === 1;
    if (wantDouble ? !isDouble : !isSingle) continue;
    if (!allow.has(diff)) continue;

    const prev = best.get(mcode);
    if (prev == null || ck > prev) best.set(mcode, ck);
  }
  return best;
}

function songLabel(s: SongRow): string {
  return s.title || s.basename || `#${s.mcode}`;
}

/* ================== Componente principal ================== */
export default function DancersHome() {
  const [rows, setRows] = useState<DancerSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchDancersSummary();
        if (!alive) return;
        setRows(res);
      } catch (e) {
        if (alive) setErr("No se pudo cargar el resumen de jugadores");
        console.warn("[DancersHome] fetchDancersSummary error:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.dancerName.toLowerCase().includes(filter.toLowerCase())),
    [rows, filter]
  );

  return (
    <div className="dh-wrap">
      <h1 className="dh-title">Resumen de Dancers</h1>
      <p className="dh-subtitle">Explora perfiles, logros y progreso.</p>

      <input
        placeholder="Buscar jugador…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="dh-input"
      />

      {loading && <div className="dh-muted">Cargando…</div>}
      {err && <div className="dh-error">{err}</div>}

      <div className="dh-total">Total jugadores: {filtered.length}</div>

      {filtered.length === 0 ? (
        <div className="dh-muted">No hay jugadores que coincidan con “{filter}”</div>
      ) : (
        <div className="dh-grid">
          {filtered.map((r, i) => (
            <div key={r.dancerName} className="dh-card" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="dh-card-name">{r.dancerName}</div>

              <div className="dh-stats">
                <Stat label="Total" value={r.total} color="#011118ff" />
                <Stat label="AAA" value={r.AAA} color="#fbbf24" />
                <Stat label="FC" value={r.FC} color="#06b6d4" />
                <Stat label="GFC" value={r.GFC} color="#16b62bff" />
                <Stat label="PFC" value={r.PFC} color="#fbbf24" />
                <Stat label="MFC" value={r.MFC} color="#edf7c1e5" />
              </div>

              <SeriesBadges dancerName={r.dancerName} />

              <button
                onClick={() => navigate(`/scores?dancer=${encodeURIComponent(r.dancerName)}`)}
                className="dh-btn"
              >
                Ver scores
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================== Subcomponentes ================== */
function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="dh-stat">
      <div className="dh-stat-value" style={{ color }}>{value}</div>
      <div className="dh-stat-label">{label}</div>
    </div>
  );
}

function SeriesBadges({ dancerName }: { dancerName: string }) {
  const [view, setView] = useState<View>("ESP");
  const [badges, setBadges] = useState<Badge[] | null>(null);
  const [open, setOpen] = useState<Badge | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const songs = await loadSongs();
        if (!songs.length) {
          setWarn("No se pudo cargar el catálogo de canciones (songs.json). Mostrando progreso vacío.");
        }
        const seriesMap = buildSeriesMapForView(songs, view);

        const allScores = await fetchScores({ dancer: dancerName, limit: 5000 });
        const best = bestClearByMcode(allScores, view);

        const out: Badge[] = [];
        const entries = seriesMap.size > 0 ? Array.from(seriesMap.entries()) : [];

        for (const [series, seriesSongs] of entries) {
          const total = seriesSongs.length;
          const started = seriesSongs.some((s) => best.has(s.mcode));

          let doneFC = 0;
          const missing: string[] = [];
          const completed: string[] = [];
          const gfcButNoPfc: string[] = [];

          for (const s of seriesSongs) {
            const ck = best.get(s.mcode) ?? -1;
            if (ck >= 9) {
              doneFC++;
              completed.push(`${songLabel(s)} (PFC)`);
            } else if (ck >= 8) {
              doneFC++;
              completed.push(`${songLabel(s)} (GFC)`);
              gfcButNoPfc.push(songLabel(s));
            } else if (ck >= 7) {
              doneFC++;
              completed.push(`${songLabel(s)} (FC)`);
            } else {
              missing.push(songLabel(s));
            }
          }

          let tier: Tier = "none";
          if (total > 0) {
            const allPFC = seriesSongs.every((s) => (best.get(s.mcode) ?? -1) >= 9);
            const allGFC = seriesSongs.every((s) => (best.get(s.mcode) ?? -1) >= 8);
            const allFC  = seriesSongs.every((s) => (best.get(s.mcode) ?? -1) >= 7);
            if (allPFC) tier = "gold";
            else if (allGFC) tier = "green";
            else if (allFC)  tier = "blue";
          }

          out.push({
            series,
            tier,
            done: doneFC,
            total,
            missing,
            completed,
            started,
            gfcButNoPfc: gfcButNoPfc.length ? gfcButNoPfc : undefined,
          });
        }

        if (!alive) return;
        setBadges(out.sort((a, b) => a.series - b.series));
      } catch (e) {
        console.warn("[SeriesBadges] cálculo de insignias falló:", e);
        if (!alive) return;
        setWarn("No se pudieron calcular las insignias. Revisa songs.json y la red.");
        setBadges([]);
      }
    })();
    return () => { alive = false; };
  }, [dancerName, view]);

  if (!badges) return <div className="dh-muted-mini">Calculando insignias…</div>;

  const singleViews: View[] = ["ESP", "DSP", "BSP", "CSP", "SP"];
  const doubleViews: View[] = ["BDP", "DDP", "EDP", "CDP", "DP"];

  return (
    <div className="dh-badges-block">
      <div className="dh-badges-title">Insignias por serie</div>

      <div className="dh-toggle">
        <div className="dh-toggle-row" aria-label="Single charts">
          {singleViews.map((v) => (
            <button
              key={v}
              className={`dh-toggle-btn ${view === v ? "active" : ""}`}
              onClick={() => setView(v)}
              type="button"
            >
              {v}
            </button>
          ))}
        </div>
        <div className="dh-toggle-row" aria-label="Double charts">
          {doubleViews.map((v) => (
            <button
              key={v}
              className={`dh-toggle-btn ${view === v ? "active" : ""}`}
              onClick={() => setView(v)}
              type="button"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {warn && <div className="dh-error-mini">{warn}</div>}

      <div className="dh-badges-wrap">
        {badges.length === 0 ? (
          <div className="dh-muted-mini">Sin series detectadas</div>
        ) : (
          badges.map((b) => (
            <div
              key={b.series}
              className={`dh-badge ${b.tier} ${b.started ? "" : "inactive"}`}
              onClick={() => setOpen(b)}
              title={`Serie ${b.series}: ${b.done}/${b.total}`}
            >
              <img
                src={`/assets/badges/DDR_${b.series}.webp`}
                onError={(e) => { e.currentTarget.src = "/assets/badges/DDR_default.webp"; }}
                alt={`DDR ${b.series}`}
              />
            </div>
          ))
        )}
      </div>

      {open && <BadgeModal badge={open} view={view} onClose={() => setOpen(null)} />}
    </div>
  );
}

function BadgeModal({ badge, view, onClose }: { badge: Badge; view: View; onClose: () => void }) {
  const labelView = view;
  const isAll = badge.done === badge.total && badge.total > 0;

  return (
    <div className="dh-modal-overlay" onClick={onClose}>
      <div className="dh-modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>
          Serie {badge.series} · {badge.done}/{badge.total} completadas ({labelView})
        </h3>

        {badge.total === 0 ? (
          <p>No hay canciones con charts {labelView} registrados para esta serie.</p>
        ) : isAll ? (
          <>
            {badge.tier === "gold" ? (
              <p>¡Todas las canciones {labelView} completadas con PFC!</p>
            ) : badge.tier === "green" ? (
              <>
                <p>¡Todas las canciones {labelView} completadas con GFC!</p>
                {badge.gfcButNoPfc?.length ? (
                  <>
                    <p>Faltan con PFC:</p>
                    <ul>
                      {badge.gfcButNoPfc.map((t, i) => (
                        <li key={i}>• {t}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            ) : (
              <p>¡Todas las canciones {labelView} completadas con FC!</p>
            )}
          </>
        ) : (
          <>
            {badge.completed.length > 0 && (
              <>
                <p>Completadas:</p>
                <ul>
                  {badge.completed.map((t, i) => (
                    <li key={i}>✔ {t}</li>
                  ))}
                </ul>
              </>
            )}
            {badge.missing.length > 0 && (
              <>
                <p>Faltan (sin FC):</p>
                <ul>
                  {badge.missing.map((t, i) => (
                    <li key={i}>✘ {t}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        <button onClick={onClose} className="dh-btn" style={{ marginTop: 12 }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
