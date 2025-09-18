// frontend/src/components/JudgmentStats.tsx
import { useEffect, useMemo, useState } from "react";
import {
  fetchJudgmentStats,
  type JudgmentStatsResponse,
  type PlayerJudgmentTotals,
} from "../api/client";
import "./judgments.css"; // estilos separados

export default function JudgmentStats() {
  const [data, setData] = useState<JudgmentStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeRefid, setActiveRefid] = useState<string>(""); // "" = Todos

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const d = await fetchJudgmentStats(activeRefid || undefined);
        if (alive) setData(d);
      } catch {
        if (alive) setErr("No se pudieron cargar los juicios");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [activeRefid]);

  const allDancers = useMemo(() => {
    const p = data?.players ?? [];
    return [...p].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [data]);

  const players = useMemo(() => data?.players ?? [], [data]);

  return (
    <div className="judg-wrap">
      <h1 className="judg-title">Juicios (Marvelous / Perfect / …)</h1>

      {/* Botonera de filtros por dancer */}
      <div className="judg-filters">
        <button
          className={`judg-chip ${activeRefid === "" ? "is-active" : ""}`}
          onClick={() => setActiveRefid("")}
          title="Ver todos"
        >
          Todos
        </button>
        {allDancers.map((p) => (
          <button
            key={p.refid}
            className={`judg-chip ${activeRefid === p.refid ? "is-active" : ""}`}
            onClick={() => setActiveRefid(p.refid)}
            title={p.name || undefined}
          >
            {p.name || "—"}
          </button>
        ))}
      </div>

      {err && <div className="judg-error">{err}</div>}

      {/* Global */}
      <section className="judg-stats-grid">
        <Stat label="Canciones (global)" value={data?.global_.songs} />
        <Stat label="Marvelous" value={data?.global_.marvelous} className="judg-marv" />
        <Stat label="Perfect" value={data?.global_.perfect} className="judg-perf" />
        <Stat label="Great" value={data?.global_.great} className="judg-great" />
        <Stat label="Good" value={data?.global_.good} className="judg-good" />
        <Stat label="Miss" value={data?.global_.miss} className="judg-miss" />
        <Stat label="Notas totales" value={data?.global_.total_notes} />
      </section>

      {/* Tabla por jugador */}
      <div className="judg-table-wrap">
        <table className="judg-table">
          <thead>
            <tr>
              <Th>Dancer</Th>
              <Th>Canciones</Th>
              <Th>Marvelous</Th>
              <Th>Perfect</Th>
              <Th>Great</Th>
              <Th>Good</Th>
              <Th>Miss</Th>
              <Th>Notas</Th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="judg-loading">
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && players.length === 0 && (
              <tr>
                <td colSpan={8} className="judg-empty">
                  Sin resultados.
                </td>
              </tr>
            )}
            {!loading &&
              players.map((p) => (
                <Row key={p.refid} p={p} />
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`judg-th ${className ?? ""}`}>{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`judg-td ${className ?? ""}`}>{children}</td>;
}

function Row({ p }: { p: PlayerJudgmentTotals }) {
  return (
    <tr>
      <Td>{p.name || "—"}</Td>
      <Td>{p.songs}</Td>
      <Td className="judg-marv">{p.marvelous}</Td>
      <Td className="judg-perf">{p.perfect}</Td>
      <Td className="judg-great">{p.great}</Td>
      <Td className="judg-good">{p.good}</Td>
      <Td className="judg-miss">{p.miss}</Td>
      <Td>{p.total_notes}</Td>
    </tr>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: number | undefined;
  className?: string;
}) {
  return (
    <div className="judg-card">
      <div className="judg-card-label">{label}</div>
      <div className={`judg-card-value ${className || ""}`}>{value ?? "—"}</div>
    </div>
  );
}
