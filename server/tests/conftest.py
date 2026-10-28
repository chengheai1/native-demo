from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        app_env="test",
        database_path=tmp_path / "test.db",
        public_base_url="http://testserver",
        frontend_origin="http://testserver",
        google_client_id="test-client-id",
        google_client_secret="test-client-secret",
        allow_demo_auth=True,
        session_days=30,
        cookie_secure=False,
        native_redirect_uris=("nativedemo://auth",),
    )


@pytest.fixture
def app(settings: Settings):
    return create_app(settings)


@pytest.fixture
def client(app) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def demo_client(client: TestClient) -> TestClient:
    response = client.post("/api/auth/demo")
    assert response.status_code == 201
    return client
