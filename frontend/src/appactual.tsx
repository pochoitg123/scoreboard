import type React from "react"; // para React.CSSProperties en el tipo del retorno
import { useEffect, useState } from "react";
import { NavLink, Routes, Route } from "react-router-dom";
import DancersHome from "./components/DancersHome";
import ScoreDashboard from "./components/ScoreDashboard";
import { fetchScores, type ScoreRow } from "./api/client";

export default function App() {
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchScores({ limit: 500, source: "score3" });
        if (!alive) return;
        setScores(res);
      } catch {
        if (alive) setErr("No se pudieron cargar los scores");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <>
      {/* NAV con pestañas */}
      <nav style={navBar}>
        <div style={navInner}>
          <div style={tabsWrap}>
            <TabLink to="/">Inicio</TabLink>
            <TabLink to="/scores">Scores</TabLink>
          </div>
        </div>
      </nav>

      <div style={{ padding: 16 }}>
        {err && <div style={{ color: "red", marginBottom: 12 }}>{err}</div>}
        <Routes>
          <Route path="/" element={<DancersHome />} />
          <Route
            path="/scores"
            element={loading ? <div>Cargando scores…</div> : <ScoreDashboard initialScores={scores} />}
          />
        </Routes>
      </div>
    </>
  );
}

/* ====== estilos de tabs ====== */
const navBar: React.CSSProperties = {
  borderBottom: "1px solid #e5e7eb",
  background: "#ffffff",
  position: "sticky",
  top: 0,
  zIndex: 10,
};
const navInner: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "10px 12px",
};
const tabsWrap: React.CSSProperties = {
  display: "inline-flex",
  gap: 6,
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 4,
};

const tabBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 14px",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 14,
  textDecoration: "none",
  color: "#334155",
  border: "1px solid transparent",
};

const tabActive: React.CSSProperties = {
  background: "#0ea5e9",
  borderColor: "#0284c7",
  color: "#ffffff",
  boxShadow: "0 1px 3px rgba(2,132,199,.25)",
};

function TabLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      style={(
        nav: { isActive: boolean; isPending: boolean; isTransitioning: boolean }
      ): React.CSSProperties =>
        nav.isActive ? { ...tabBase, ...tabActive } : { ...tabBase }
      }
    >
      {children}
    </NavLink>
  );
}
