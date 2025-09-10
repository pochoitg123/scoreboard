import { useState } from "react";
import { login, register } from "../api/auth";

export default function Login({
  onLogged,
  onGoForgot,
}: {
  onLogged: () => void;
  onGoForgot: () => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(""); // solo registro
  const [refid, setRefid] = useState(""); // solo registro, debe existir en profile3
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    setLoading(true);
    try {
      setErr(null);
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), email.trim(), refid.trim(), password);
      }
      onLogged();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    username.trim().length > 0 &&
    password.length > 0 &&
    (mode === "login" || (email.trim().length > 0 && refid.trim().length > 0));

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={tabsWrap}>
          <button
            type="button"
            onClick={() => setMode("login")}
            style={mode === "login" ? tabActive : tab}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            style={mode === "register" ? tabActive : tab}
          >
            Crear cuenta
          </button>
        </div>

        {err && <div style={errorBox}>{err}</div>}

        {/* Form: permite enviar con Enter */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) submit();
          }}
          style={{ display: "grid", gap: 12 }}
        >
          <label style={label}>
            <span style={labelText}>Usuario</span>
            <input
              autoFocus
              placeholder="Tu usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={input}
            />
          </label>

          {mode === "register" && (
            <>
              <label style={label}>
                <span style={labelText}>Correo (obligatorio)</span>
                <input
                  placeholder="tucorreo@dominio.cl"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={input}
                />
              </label>
              <label style={label}>
                <span style={labelText}>RefID del juego (__refid)</span>
                <input
                  placeholder="Ej: AA6BD8945A64572E"
                  value={refid}
                  onChange={(e) => setRefid(e.target.value)}
                  style={input}
                />
              </label>
            </>
          )}

          <label style={label}>
            <span style={labelText}>Contraseña</span>
            <input
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={input}
            />
          </label>

          <div style={actions}>
            <button
              type="submit"
              disabled={!canSubmit || loading}
              style={{
                ...primaryBtn,
                ...(loading || !canSubmit ? disabledBtn : null),
              }}
              title="Presiona Enter para enviar"
            >
              {loading
                ? "Procesando…"
                : mode === "login"
                ? "Entrar"
                : "Registrarme"}
            </button>

           
            {mode === "login" && (
              <button type="button" onClick={onGoForgot} style={linkBtn}>
                Olvidé mi contraseña
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

/* ====== Estilos inline (oscuro, minimal) ====== */
const wrap: React.CSSProperties = {
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  background:
    "radial-gradient(1200px 600px at 70% -20%, rgba(14,165,233,.15), transparent), #0b1220",
  padding: 16,
};

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  background: "#0f172a",
  border: "1px solid #1f2937",
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,.4)",
  padding: 18,
  color: "#e5e7eb",
  display: "grid",
  gap: 14,
};

const tabsWrap: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 6,
  background: "#0b1220",
  border: "1px solid #1f2937",
  borderRadius: 12,
  padding: 6,
};

const tabBase: React.CSSProperties = {
  height: 40,
  borderRadius: 8,
  fontWeight: 800,
  letterSpacing: 0.2,
  cursor: "pointer",
};

const tab: React.CSSProperties = {
  ...tabBase,
  background: "transparent",
  color: "#a3a3a3",
  border: "1px dashed transparent",
};

const tabActive: React.CSSProperties = {
  ...tabBase,
  background:
    "linear-gradient(180deg, rgba(14,165,233,.2) 0%, rgba(14,165,233,.05) 100%)",
  color: "#e5e7eb",
  border: "1px solid #0891b2",
  boxShadow: "inset 0 0 10px rgba(14,165,233,.1)",
};

const errorBox: React.CSSProperties = {
  background: "rgba(239, 68, 68, .08)",
  color: "#fecaca",
  border: "1px solid rgba(239, 68, 68, .5)",
  padding: "8px 10px",
  borderRadius: 10,
  fontSize: 13,
};

const label: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const labelText: React.CSSProperties = {
  fontSize: 13,
  color: "#9ca3af",
  fontWeight: 700,
};

const input: React.CSSProperties = {
  height: 40,
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid #334155",
  outline: "none",
  background: "#0b1220",
  color: "#e5e7eb",
  fontWeight: 600,
  fontSize: 14,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,.02)",
};

const actions: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
  marginTop: 6,
};

const primaryBtn: React.CSSProperties = {
  height: 40,
  padding: "0 14px",
  borderRadius: 10,
  background:
    "linear-gradient(180deg, #67e8f9 0%, #06b6d4 100%)",
  color: "#0b1220",
  fontWeight: 900,
  letterSpacing: 0.3,
  border: "1px solid #0891b2",
  cursor: "pointer",
};

const disabledBtn: React.CSSProperties = {
  opacity: 0.6,
  cursor: "not-allowed",
  filter: "grayscale(30%)",
};

const ghostBtn: React.CSSProperties = {
  height: 40,
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid #374151",
  background: "transparent",
  color: "#e5e7eb",
  fontWeight: 800,
  cursor: "pointer",
};

const linkBtn: React.CSSProperties = {
  marginLeft: "auto",
  height: 40,
  padding: "0 10px",
  borderRadius: 8,
  background: "transparent",
  color: "#93c5fd",
  border: "1px dashed transparent",
  cursor: "pointer",
  fontWeight: 700,
};
