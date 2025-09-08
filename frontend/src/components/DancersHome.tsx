import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDancersSummary, type DancerSummaryRow } from "../api/client";

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
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = rows.filter((r) =>
    r.dancerName.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ fontWeight: 900, fontSize: 20 }}>Resumen por jugador</h1>
      <div style={{ color: "#64748b" }}>
        AAA por rank · MFC/PFC/GFC/FC por clearKind
      </div>

      <input
        placeholder="Buscar jugador…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: "6px 10px",
          maxWidth: 260,
        }}
      />

      {loading && <div>Cargando…</div>}
      {err && <div style={{ color: "red" }}>{err}</div>}

      <div style={{ fontWeight: 600, color: "#475569" }}>
        Total jugadores: {filtered.length}
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: "#6b7280" }}>
          No hay jugadores que coincidan con "{filter}"
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((r) => (
            <div
              key={r.dancerName}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
                background: "#fff",
                boxShadow: "0 2px 6px rgba(0,0,0,.05)",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 16 }}>
                {r.dancerName}
              </div>
              <div style={statsRow}>
                <Stat label="Total" value={r.total} color="#0ea5e9" />
                <Stat label="AAA" value={r.AAA} color="#22c55e" />
                <Stat label="FC" value={r.FC} color="#06b6d4" />
                <Stat label="GFC" value={r.GFC} color="#9ca3af" />
                <Stat label="PFC" value={r.PFC} color="#fbbf24" />
                <Stat label="MFC" value={r.MFC} color="#f59e0b" />
              </div>

              <button
                onClick={() =>
                  navigate(`/scores?dancer=${encodeURIComponent(r.dancerName)}`)
                }
                style={{
                  marginTop: 8,
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #0ea5e9",
                  background: "#0ea5e9",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
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

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
      <div style={{ fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const statsRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(50px, 1fr))",
  gap: 4,
};
