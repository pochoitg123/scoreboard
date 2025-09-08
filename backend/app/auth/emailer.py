import smtplib, ssl
from email.message import EmailMessage
from app.core.config import settings

def send_password_reset_email(to_email: str, reset_link: str):
    subject = "Recuperar contraseña - PIU/DDR WebUI"
    body = f"Hola,\n\nPara restablecer tu contraseña haz clic en:\n{reset_link}\n\nSi no solicitaste esto, ignora el mensaje."
    if settings.EMAIL_BACKEND.lower() != "smtp":
        # modo consola (dev)
        print("=== PASSWORD RESET EMAIL (console) ===")
        print("To:", to_email)
        print("Subject:", subject)
        print("Body:\n", body)
        print("======================================")
        return

    msg = EmailMessage()
    msg["From"] = settings.FROM_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    context = ssl.create_default_context()
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        if settings.SMTP_TLS:
            server.starttls(context=context)
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
