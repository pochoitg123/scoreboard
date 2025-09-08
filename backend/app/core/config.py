# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Rutas de tus datos
    NDJSON_PATH: str = "C:/asphyxia/savedata/ddr@mdx.db"
    SONGS_DICT_PATH: str = "C:/Users/Pochogeims/Downloads/piu-ddr-scoreboardbkp/piu-ddr-scoreboard/songs.json"

    # CORS (frontend)
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Auth (JWT)
    SECRET_KEY: str = "Uncle.9090"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_ALG: str = "HS256"

    # Usuarios (almacenamiento JSON)
    USERS_JSON_PATH: str = "users.json"

    # Email / Password reset (SMTP)
    EMAIL_BACKEND: str = "smtp"
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587          # STARTTLS
    SMTP_USER: str = "joeyignaciovilches@gmail.com"
    SMTP_PASSWORD: str = "oobqglmmcxdzcscb"  # App Password de Google
    SMTP_TLS: bool = True
    FROM_EMAIL: str = "joeyignaciovilches@gmail.com"
    FRONTEND_RESET_URL: str = "http://localhost:5173/#/reset?token="  # <- faltaba el tipo

    # Admin (borrado por admin)
    ADMIN_SECRET: str | None = "Uncle.9090"

settings = Settings()
