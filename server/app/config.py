from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]

load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / ".env.local", override=True)


def _as_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _as_path(value: str | None, default: Path) -> Path:
    if not value:
        return default
    path = Path(value).expanduser()
    return path if path.is_absolute() else (BASE_DIR / path).resolve()


def _as_tuple(value: str | None, default: tuple[str, ...]) -> tuple[str, ...]:
    if not value:
        return default
    return tuple(item.strip() for item in value.split(",") if item.strip())


@dataclass(frozen=True)
class Settings:
    app_env: str = "development"
    database_path: Path = field(default_factory=lambda: BASE_DIR / "data" / "app.db")
    public_base_url: str = "http://localhost:8000"
    frontend_origin: str = "http://localhost:8081"
    google_client_id: str = ""
    google_client_secret: str = ""
    # Outgoing mail (Brevo SMTP by default: smtp-relay.brevo.com:587).
    mail_host: str = ""
    mail_port: int = 587
    mail_username: str = ""
    mail_password: str = ""
    mail_from: str = ""
    mail_from_name: str = "序"
    mail_starttls: bool = True
    mail_ssl: bool = False
    email_code_ttl_seconds: int = 600
    email_code_cooldown_seconds: int = 60
    email_code_max_attempts: int = 5
    allow_demo_auth: bool = True
    session_days: int = 30
    cookie_secure: bool = False
    native_redirect_uris: tuple[str, ...] = ("nativedemo://auth",)
    web_redirect_uris: tuple[str, ...] = ("http://localhost:8081/web-auth",)
    allow_expo_go_redirects: bool = False

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"production", "prod"}

    @property
    def google_configured(self) -> bool:
        return bool(self.google_client_id.strip() and self.google_client_secret.strip())

    @property
    def mail_configured(self) -> bool:
        return bool(self.mail_host.strip() and self.mail_from.strip())

    @property
    def email_login_enabled(self) -> bool:
        # Development can run without SMTP credentials: the code is logged instead.
        return self.mail_configured or not self.is_production

    @property
    def email_login_dev_mode(self) -> bool:
        return not self.mail_configured and not self.is_production

    @property
    def redirect_uri(self) -> str:
        return f"{self.public_base_url.rstrip('/')}/api/auth/google/callback"

    @property
    def allowed_origins(self) -> set[str]:
        origins = {
            self.public_base_url.rstrip("/"),
            self.frontend_origin.rstrip("/"),
        }
        if not self.is_production:
            origins.update(
                {
                    "http://localhost:8081",
                    "http://127.0.0.1:8081",
                    "http://localhost:19006",
                }
            )
        for redirect_uri in self.web_redirect_uris:
            parsed = urlparse(redirect_uri)
            if parsed.scheme and parsed.netloc:
                origins.add(f"{parsed.scheme}://{parsed.netloc}")
        return {origin for origin in origins if origin}

    def web_redirect_allowed(self, redirect_uri: str) -> bool:
        candidate = redirect_uri.rstrip("/")
        configured = {uri.rstrip("/") for uri in self.web_redirect_uris}
        return candidate in configured

    def native_redirect_allowed(self, redirect_uri: str) -> bool:
        candidate = redirect_uri.rstrip("/")
        configured = {uri.rstrip("/") for uri in self.native_redirect_uris}
        if candidate in configured:
            return True
        # Expo Go uses an exp:// deep link during development. A standalone
        # development build uses the configured `nativedemo://auth` scheme.
        if redirect_uri.startswith(("exp://", "exps://")):
            return self.allow_expo_go_redirects or not self.is_production
        return False

    @classmethod
    def from_env(cls) -> "Settings":
        app_env = os.getenv("APP_ENV", "development")
        return cls(
            app_env=app_env,
            database_path=_as_path(
                os.getenv("DATABASE_PATH"),
                BASE_DIR / "data" / "app.db",
            ),
            public_base_url=os.getenv("PUBLIC_BASE_URL", "http://localhost:8000"),
            frontend_origin=os.getenv("FRONTEND_ORIGIN", "http://localhost:8081"),
            google_client_id=os.getenv("GOOGLE_CLIENT_ID", ""),
            google_client_secret=os.getenv("GOOGLE_CLIENT_SECRET", ""),
            mail_host=os.getenv("MAIL_HOST", ""),
            mail_port=int(os.getenv("MAIL_PORT", "587")),
            mail_username=os.getenv("MAIL_USERNAME", ""),
            mail_password=os.getenv("MAIL_PASSWORD", ""),
            mail_from=os.getenv("MAIL_FROM", ""),
            mail_from_name=os.getenv("MAIL_FROM_NAME", "序"),
            mail_starttls=_as_bool(os.getenv("MAIL_STARTTLS"), default=True),
            mail_ssl=_as_bool(os.getenv("MAIL_SSL"), default=False),
            email_code_ttl_seconds=int(os.getenv("EMAIL_CODE_TTL_SECONDS", "600")),
            email_code_cooldown_seconds=int(
                os.getenv("EMAIL_CODE_COOLDOWN_SECONDS", "60")
            ),
            email_code_max_attempts=int(os.getenv("EMAIL_CODE_MAX_ATTEMPTS", "5")),
            allow_demo_auth=_as_bool(
                os.getenv("ALLOW_DEMO_AUTH"),
                default=app_env.lower() not in {"production", "prod"},
            ),
            session_days=int(os.getenv("SESSION_DAYS", "30")),
            cookie_secure=_as_bool(
                os.getenv("COOKIE_SECURE"),
                default=app_env.lower() in {"production", "prod"},
            ),
            native_redirect_uris=_as_tuple(
                os.getenv("NATIVE_REDIRECT_URIS"),
                ("nativedemo://auth",),
            ),
            web_redirect_uris=_as_tuple(
                os.getenv("WEB_REDIRECT_URIS"),
                ("http://localhost:8081/web-auth",),
            ),
            allow_expo_go_redirects=_as_bool(
                os.getenv("ALLOW_EXPO_GO_REDIRECTS"),
                default=False,
            ),
        )
