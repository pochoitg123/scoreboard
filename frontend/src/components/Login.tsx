import { useState } from "react";
import { login, register } from "../api/auth";

export default function Login({ onLogged, onGoForgot }: { onLogged: () => void; onGoForgot: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");   // solo registro
  const [refid, setRefid] = useState("");   // solo registro, debe existir en profile3
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    try {
      setErr(null);
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, email, refid, password);
      }
      onLogged();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Error");
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 360 }}>
      <h2>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h2>
      {err && <div style={{ color: "crimson" }}>{err}</div>}

      <input placeholder="Usuario" value={username} onChange={e => setUsername(e.target.value)} />
      {mode === "register" && (
        <>
          <input placeholder="Correo (obligatorio)" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <input placeholder="RefID (__refid) del juego" value={refid} onChange={e => setRefid(e.target.value)} />
        </>
      )}
      <input placeholder="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={submit} style={{ padding: "6px 10px" }}>
          {mode === "login" ? "Entrar" : "Registrarme"}
        </button>
        <button onClick={() => setMode(mode === "login" ? "register" : "login")} style={{ padding: "4px 8px" }}>
          {mode === "login" ? "Crear cuenta nueva" : "Ya tengo cuenta"}
        </button>
        {mode === "login" && (
          <button type="button" onClick={onGoForgot} style={{ padding: "4px 8px", marginLeft: "auto" }}>
            Olvidé mi contraseña
          </button>
        )}
      </div>
    </div>
  );
}
