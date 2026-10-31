from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .auth import router as auth_router
from .config import Settings
from .db import init_db
from .errors import ApiError, error_body, install_error_handlers, success_body
from .google import GoogleClient
from .todos import router as todos_router

logger = logging.getLogger("uvicorn.error")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        init_db(settings.database_path)
        app.state.settings = settings
        app.state.google = GoogleClient(settings)
        if not settings.google_configured:
            logger.warning(
                "Google OAuth is disabled: set GOOGLE_CLIENT_ID and "
                "GOOGLE_CLIENT_SECRET in server/.env, then restart."
            )
        if not settings.mail_configured:
            if settings.is_production:
                logger.warning(
                    "Email login is disabled: set MAIL_HOST, MAIL_USERNAME, "
                    "MAIL_PASSWORD and MAIL_FROM in the runtime environment."
                )
            else:
                logger.warning(
                    "Email login runs in dev mode: verification codes are written "
                    "to this log instead of being sent."
                )
        yield

    app = FastAPI(
        title="序 API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/api/docs" if not settings.is_production else None,
        openapi_url="/api/openapi.json" if not settings.is_production else None,
    )
    app.state.settings = settings
    app.state.google = GoogleClient(settings)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=sorted(settings.allowed_origins),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    install_error_handlers(app)

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        if request.method not in {"GET", "HEAD", "OPTIONS"} and request.url.path.startswith(
            "/api/"
        ):
            origin = request.headers.get("origin")
            if origin and origin.rstrip("/") not in settings.allowed_origins:
                return JSONResponse(
                    status_code=403,
                    content=error_body("origin_not_allowed", "请求来源不被允许"),
                )

        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("X-Frame-Options", "DENY")
        if request.url.path.startswith("/api/"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response

    @app.middleware("http")
    async def standard_api_response(request: Request, call_next):
        response = await call_next(request)
        is_api = request.url.path.startswith("/api/")
        is_openapi = request.url.path == "/api/openapi.json"
        is_json = response.headers.get("content-type", "").startswith("application/json")
        if not is_api or is_openapi or not is_json or not 200 <= response.status_code < 300:
            return response
        if response.status_code == 204:
            return response

        body = b"".join([chunk async for chunk in response.body_iterator])
        headers = dict(response.headers)
        headers.pop("content-length", None)
        return JSONResponse(
            status_code=response.status_code,
            content=success_body(json.loads(body)),
            headers=headers,
            background=response.background,
        )

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(auth_router)
    app.include_router(todos_router)

    @app.api_route(
        "/api/{rest:path}",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        include_in_schema=False,
    )
    async def api_not_found(rest: str) -> None:
        raise ApiError(404, "not_found", "接口不存在")

    @app.get("/", include_in_schema=False)
    def api_root() -> dict[str, str]:
        return {
            "name": "xu-native-api",
            "status": "ok",
            "docs": "/api/docs",
        }

    return app


app = create_app()
