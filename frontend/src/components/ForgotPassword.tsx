import { useState } from "react";
import { forgotPassword } from "../api/auth";

export default function ForgotPassword({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    try {
      await forgotPassword(email);
      setMsg("Si el correo existe, se envió un enlace para restablecer la contraseña.");
    } catch (e: any) {
      setMsg("Listo. Revisa tu correo si existe una cuenta asociada.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 360 }}>
      <h2>Recuperar contraseña</h2>
      <input placeholder="Tu correo" type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <button onClick={submit} style={{ padding: "6px 10px" }}>Enviar enlace</button>
      {msg && <div style={{ color: "#065f46" }}>{msg}</div>}
      <button onClick={onDone} style={{ padding: "4px 8px" }}>Volver</button>
    </div>
  );
}
