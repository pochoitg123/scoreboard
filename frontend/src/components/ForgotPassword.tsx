import { useState } from "react";
import { forgotPassword } from "../api/auth";
import "./ForgotPassword.css";

export default function ForgotPassword({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim()) {
      setMsg("Por favor, ingresa tu correo.");
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      await forgotPassword(email.trim());
      setMsg("Si el correo existe, te enviamos un enlace para restablecer la contraseña.");
    } catch {
      // Por seguridad, no revelamos si el correo existe o no.
      setMsg("Si el correo existe, te enviamos un enlace para restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fp-wrap">
      <div className="fp-card">
        <h2 className="fp-title">¿Olvidaste tu contraseña?</h2>
        <p className="fp-sub">
          Ingresa tu correo y te enviaremos un enlace para restablecerla.
        </p>

        <input
          className="fp-input"
          type="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <button
          className="fp-btn"
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Enviando…" : "Enviar enlace"}
        </button>

        {msg && <div className="fp-msg">{msg}</div>}

        <button className="fp-link" onClick={onDone} disabled={loading}>
          Volver al login
        </button>
      </div>
    </div>
  );
}
