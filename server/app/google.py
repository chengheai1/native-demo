from __future__ import annotations

import base64
import hashlib
import secrets
from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

from .config import Settings

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
GOOGLE_SCOPE = "openid email profile"


class GoogleAuthError(Exception):
    """A safe, non-detailed OAuth failure."""


@dataclass(frozen=True)
class GoogleUser:
    sub: str
    email: str
    name: str
    picture_url: str | None
    email_verified: bool


def create_pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)[:128]
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return verifier, challenge


class GoogleClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def authorization_url(self, state: str, code_challenge: str) -> str:
        query = urlencode(
            {
                "client_id": self.settings.google_client_id,
                "redirect_uri": self.settings.redirect_uri,
                "response_type": "code",
                "scope": GOOGLE_SCOPE,
                "state": state,
                "code_challenge": code_challenge,
                "code_challenge_method": "S256",
                "access_type": "online",
                "prompt": "select_account",
            }
        )
        return f"{GOOGLE_AUTH_URL}?{query}"

    def exchange_code(self, code: str, code_verifier: str) -> str:
        try:
            response = httpx.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": self.settings.google_client_id,
                    "client_secret": self.settings.google_client_secret,
                    "code": code,
                    "code_verifier": code_verifier,
                    "grant_type": "authorization_code",
                    "redirect_uri": self.settings.redirect_uri,
                },
                timeout=10.0,
            )
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise GoogleAuthError("Could not exchange Google authorization code") from exc

        access_token = payload.get("access_token")
        if not isinstance(access_token, str) or not access_token:
            raise GoogleAuthError("Google did not return an access token")
        return access_token

    def fetch_userinfo(self, access_token: str) -> GoogleUser:
        try:
            response = httpx.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0,
            )
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise GoogleAuthError("Could not read Google profile") from exc

        sub = payload.get("sub")
        email = payload.get("email")
        if not isinstance(sub, str) or not isinstance(email, str):
            raise GoogleAuthError("Google profile is incomplete")

        return GoogleUser(
            sub=sub,
            email=email,
            name=str(payload.get("name") or email.split("@")[0]),
            picture_url=payload.get("picture") if isinstance(payload.get("picture"), str) else None,
            email_verified=payload.get("email_verified") is True,
        )
