import { useEffect, useState } from "react";
import { resetPassword } from "../api/auth";

function getTokenFromHash(): string {
  const h = window.location.hash || "";
  // soporta "#/reset?token=..." o "#?token=..."
  const q = h.split("?")[1] || "";
  const params = new URLSearchParams(q);
  return params.get("token") || "";
}

export default function ResetPassword({ onDone }: { onDone: () => void }) {
  const [token, setToken] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { setToken(getTokenFromHash()); }, []);

  async function submit() {
    try {
      await resetPassword(token, pw);
      setMsg("Contraseña actualizada. Ya puedes iniciar sesión.");
    } catch (e: any) {
      setMsg("No se pudo restablecer: token inválido o expirado.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 360 }}>
      <h2>Restablecer contraseña</h2>
      <input placeholder="Token" value={token} onChange={e => setToken(e.target.value)} />
      <input placeholder="Nueva contraseña" type="password" value={pw} onChange={e => setPw(e.target.value)} />
      <button onClick={submit} style={{ padding: "6px 10px" }}>Guardar</button>
      {msg && <div style={{ color: "#065f46" }}>{msg}</div>}
      <button onClick={onDone} style={{ padding: "4px 8px" }}>Volver</button>
    </div>
  );
}
