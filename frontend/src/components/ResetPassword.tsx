import { useEffect, useState } from "react";
import { resetPassword } from "../api/auth";
import "./ResetPassword.css"; // 👈 archivo de estilos

function getTokenFromURL(): string {
  const h = window.location.hash || "";
  const hashQuery = h.includes("?") ? h.split("?")[1] : "";
  const fromHash = new URLSearchParams(hashQuery).get("token");
  const fromSearch = new URLSearchParams(window.location.search || "").get("token");
  return fromHash || fromSearch || "";
}

export default function ResetPassword({ onDone }: { onDone: () => void }) {
  const [token, setToken] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setToken(getTokenFromURL());
  }, []);

  async function submit() {
    try {
      await resetPassword(token, pw);
      setMsg("✅ Contraseña actualizada. Ya puedes iniciar sesión.");
    } catch (e: any) {
      setMsg("❌ No se pudo restablecer: token inválido o expirado.");
    }
  }

  return (
    <div className="reset-wrap">
      <div className="reset-card">
        <h2 className="reset-title">Restablecer contraseña</h2>

        <input
          className="reset-input"
          placeholder="Token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <input
          className="reset-input"
          placeholder="Nueva contraseña"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />

        <button onClick={submit} className="reset-btn">
          Guardar
        </button>

        {msg && <div className="reset-msg">{msg}</div>}

        <button onClick={onDone} className="reset-link">
          Volver al login
        </button>
      </div>
    </div>
  );
}
