"""Shared test fixtures.

Every test runs against a throwaway SQLite file under pytest's tmp_path:
base.DB_PATH is monkeypatched per test, so get_connection() initializes a
fresh schema in isolation and the live db/maes.sqlite3 is never touched.

sys.path is set up the same way the production entry points do it
(pipeline/dedupe.py and scripts/db.py both insert the scouts/ dir), so
`import base` here resolves to the exact same module object the code under
test uses, and the monkeypatch is seen everywhere.
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
for sub in ("scouts", "pipeline", "scripts"):
    p = str(REPO_ROOT / sub)
    if p not in sys.path:
        sys.path.insert(0, p)

import pytest  # noqa: E402

import base  # noqa: E402


@pytest.fixture
def db_path(tmp_path, monkeypatch):
    """Point every get_connection() call at a fresh, empty database file."""
    path = tmp_path / "test.sqlite3"
    monkeypatch.setattr(base, "DB_PATH", path)
    return path


@pytest.fixture
def conn(db_path):
    """An open connection to the fresh test database, schema applied."""
    c = base.get_connection()
    yield c
    c.close()


class FakeResponse:
    """Stand-in for requests.Response, just enough surface for the scouts."""

    def __init__(self, text: str = "", json_data=None, status_code: int = 200):
        self.text = text
        self._json = json_data
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            import requests

            raise requests.HTTPError(f"status {self.status_code}")

    def json(self):
        return self._json


@pytest.fixture
def fake_response():
    return FakeResponse
