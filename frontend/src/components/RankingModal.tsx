import type { SongRankingItem, SongRankingResponse } from "../api/client";
import {
  Icon,
  rankIconNames,
  clearIconNames,
  getRankLabel,
  getClearLabel,
  publicUrl,
} from "../utils/icons";

type Props = {
  open: boolean;
  onClose: () => void;
  song: { songId: number | string; title: string; cover: string } | null;
  ranking: SongRankingResponse | null;
  loading: boolean;
};

export default function RankingModal({
  open,
  onClose,
  song,
  ranking,
  loading,
}: Props) {
  if (!open || !song) return null;

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "100px 1fr auto",
            gap: 12,
            alignItems: "center",
          }}
        >
          <img
            src={song.cover}
            onError={(e) => (e.currentTarget.src = publicUrl("songs/_missing.png"))}
            style={{
              width: 100,
              height: 100,
              objectFit: "cover",
              borderRadius: 10,
              border: "2px solid #22d3ee",
            }}
          />
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{song.title}</div>
            <div style={{ color: "#64748b", fontSize: 12 }}>
              TOP 5 Single · TOP 5 Double
            </div>
          </div>
          <button onClick={onClose} style={modalClose}>
            ✕
          </button>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <RankingColumn
            title="Single (S)"
            loading={loading}
            items={ranking?.single || []}
          />
          <RankingColumn
            title="Double (D)"
            loading={loading}
            items={ranking?.double || []}
          />
        </div>
      </div>
    </div>
  );
}

function RankingColumn({
  title,
  loading,
  items,
}: {
  title: string;
  loading: boolean;
  items: SongRankingItem[];
}) {
  return (
    <div
      style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10, background: "#fff" }}
    >
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{title}</div>
      {loading ? (
        <div style={{ color: "#6b7280" }}>Cargando…</div>
      ) : items.length === 0 ? (
        <div style={{ color: "#6b7280" }}>—</div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "28px 1fr auto auto auto",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #e5e7eb",
              }}
            >
              {/* Posición */}
              <div
                style={{ fontWeight: 900, color: "#0ea5e9", textAlign: "center" }}
              >
                {i + 1}
              </div>

              {/* Jugador */}
              <div style={{ fontWeight: 700 }}>{it.dancerName || "UNKNOWN"}</div>

              {/* Score */}
              <div
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {it.score != null ? it.score.toLocaleString("en-US") : "-"}
              </div>

              {/* Rank */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon
                  names={rankIconNames(it.rank)}
                  size={16}
                  title={getRankLabel(it.rank)}
                />
              </div>

              {/* Clear (giro en hover) */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon
                  names={clearIconNames(it.clearKind)}
                  size={16}
                  title={getClearLabel(it.clearKind)}
                  hoverSpin
                  speedMs={900}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== estilos ===== */
const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.5)",
  display: "grid",
  placeItems: "center",
  padding: 16,
  zIndex: 50,
};
const modalCard: React.CSSProperties = {
  width: "min(900px, 100%)",
  background: "#ffffff",
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  boxShadow: "0 10px 30px rgba(0,0,0,.2)",
  padding: 14,
};
const modalClose: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  background: "#fff",
  borderRadius: 10,
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: 800,
};
