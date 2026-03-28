import time
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

from tests.conftest import register_user


def _patch_session_local(test_session_factory):
    """Patch SessionLocal in the exports router to use the test DB."""
    return patch("app.routers.exports.SessionLocal", test_session_factory)


@patch("app.services.export_service._RUST_AVAILABLE", True)
@patch("app.services.export_service.scribe")
class TestExports:
    """Test export endpoints with mocked Rust engine."""

    def test_create_export_job(self, mock_cofr, client, auth_headers, system_categories):
        headers, user_id = auth_headers
        mock_cofr.export_csv.return_value = b"Date,Amount\n2026-01-01,10.00\n"

        resp = client.post(
            "/exports",
            json={"format": "csv", "scope": "transactions"},
            headers=headers,
        )
        assert resp.status_code == 202
        data = resp.json()
        assert "job_id" in data
        assert data["format"] == "csv"
        assert data["scope"] == "transactions"

    def test_export_completes_successfully(
        self, mock_cofr, client, auth_headers, system_categories, db_session
    ):
        headers, user_id = auth_headers
        mock_cofr.export_csv.return_value = b"Date,Amount\ntest,10.00\n"

        from tests.conftest import TestSession

        with _patch_session_local(TestSession):
            resp = client.post(
                "/exports",
                json={"format": "csv", "scope": "transactions"},
                headers=headers,
            )
            job_id = resp.json()["job_id"]
            time.sleep(1.0)

            status_resp = client.get(f"/exports/{job_id}/status", headers=headers)
            assert status_resp.status_code == 200
            data = status_resp.json()
            assert data["job_id"] == job_id
            assert data["status"] == "done"

    def test_export_requires_auth(self, mock_cofr, client):
        resp = client.post("/exports", json={"format": "csv", "scope": "transactions"})
        assert resp.status_code in (401, 403)

    def test_export_status_wrong_user(self, mock_cofr, client, auth_headers, system_categories):
        headers, user_id = auth_headers
        mock_cofr.export_csv.return_value = b"fake"

        from tests.conftest import TestSession

        with _patch_session_local(TestSession):
            resp = client.post(
                "/exports",
                json={"format": "csv", "scope": "transactions"},
                headers=headers,
            )
            job_id = resp.json()["job_id"]

        token2 = register_user(client, email="other@example.com", name="Other")
        headers2 = {"Authorization": f"Bearer {token2}"}
        status_resp = client.get(f"/exports/{job_id}/status", headers=headers2)
        assert status_resp.status_code == 404

    def test_pdf_full_dump_rejected(self, mock_cofr, client, auth_headers):
        headers, _ = auth_headers
        resp = client.post(
            "/exports",
            json={"format": "pdf", "scope": "full_dump"},
            headers=headers,
        )
        assert resp.status_code == 400
        assert "PDF" in resp.json()["detail"]

    def test_invalid_format_rejected(self, mock_cofr, client, auth_headers):
        headers, _ = auth_headers
        resp = client.post(
            "/exports",
            json={"format": "doc", "scope": "transactions"},
            headers=headers,
        )
        assert resp.status_code == 422

    def test_invalid_scope_rejected(self, mock_cofr, client, auth_headers):
        headers, _ = auth_headers
        resp = client.post(
            "/exports",
            json={"format": "csv", "scope": "invalid"},
            headers=headers,
        )
        assert resp.status_code == 422

    def test_export_with_filters(self, mock_cofr, client, auth_headers, system_categories):
        headers, user_id = auth_headers
        mock_cofr.export_csv.return_value = b"filtered"

        cat_id = str(system_categories["food"].id)
        resp = client.post(
            "/exports",
            json={
                "format": "csv",
                "scope": "transactions",
                "start_date": "2026-01-01T00:00:00Z",
                "end_date": "2026-12-31T23:59:59Z",
                "category_id": cat_id,
                "currency": "NZD",
            },
            headers=headers,
        )
        assert resp.status_code == 202

    def test_export_download_after_completion(
        self, mock_cofr, client, auth_headers, system_categories
    ):
        headers, user_id = auth_headers
        mock_cofr.export_csv.return_value = b"Date,Amount\ntest,42.00\n"

        from tests.conftest import TestSession

        with _patch_session_local(TestSession):
            resp = client.post(
                "/exports",
                json={"format": "csv", "scope": "transactions"},
                headers=headers,
            )
            job_id = resp.json()["job_id"]
            time.sleep(1.0)

            download_resp = client.get(f"/exports/{job_id}/download", headers=headers)
            assert download_resp.status_code == 200
            assert "cofr-transactions-" in download_resp.headers.get("content-disposition", "")
            assert download_resp.content == b"Date,Amount\ntest,42.00\n"

    def test_export_download_not_ready(self, mock_cofr, client, auth_headers, system_categories):
        headers, _ = auth_headers

        from app.services.export_service import ExportJob, _jobs

        # Manually create a job in "rendering" state to test 409
        job = ExportJob(
            id="not-ready-test",
            user_id=auth_headers[1],
            status="rendering",
            format="csv",
            scope="transactions",
            created_at=datetime.now(UTC),
        )
        _jobs["not-ready-test"] = job

        download_resp = client.get("/exports/not-ready-test/download", headers=headers)
        assert download_resp.status_code == 409

        del _jobs["not-ready-test"]

    def test_nonexistent_job_returns_404(self, mock_cofr, client, auth_headers):
        headers, _ = auth_headers
        resp = client.get("/exports/nonexistent-id/status", headers=headers)
        assert resp.status_code == 404

    def test_export_sse_stream(self, mock_cofr, client, auth_headers, system_categories):
        headers, user_id = auth_headers
        mock_cofr.export_csv.return_value = b"data"

        from tests.conftest import TestSession

        with _patch_session_local(TestSession):
            resp = client.post(
                "/exports",
                json={"format": "csv", "scope": "transactions"},
                headers=headers,
            )
            job_id = resp.json()["job_id"]
            time.sleep(1.0)

            with client.stream("GET", f"/exports/{job_id}/stream", headers=headers) as stream_resp:
                assert stream_resp.status_code == 200
                content_type = stream_resp.headers.get("content-type", "")
                assert "text/event-stream" in content_type

                events = []
                for line in stream_resp.iter_lines():
                    if line.startswith("data: "):
                        events.append(line)
                        if '"done"' in line or '"error"' in line:
                            break

                assert len(events) >= 1
                assert any('"done"' in e for e in events)

    def test_export_xlsx_scope(self, mock_cofr, client, auth_headers, system_categories):
        headers, _ = auth_headers
        mock_cofr.export_xlsx.return_value = b"PK\x03\x04fake_xlsx"

        resp = client.post(
            "/exports",
            json={"format": "xlsx", "scope": "accounts"},
            headers=headers,
        )
        assert resp.status_code == 202

    def test_export_pdf_scope(self, mock_cofr, client, auth_headers, system_categories):
        headers, _ = auth_headers
        mock_cofr.export_pdf.return_value = b"%PDF-fake"

        resp = client.post(
            "/exports",
            json={"format": "pdf", "scope": "categories"},
            headers=headers,
        )
        assert resp.status_code == 202

    def test_download_with_query_token(self, mock_cofr, client, auth_headers, system_categories):
        headers, user_id = auth_headers
        mock_cofr.export_csv.return_value = b"token-test-data"

        from tests.conftest import TestSession

        with _patch_session_local(TestSession):
            resp = client.post(
                "/exports",
                json={"format": "csv", "scope": "transactions"},
                headers=headers,
            )
            job_id = resp.json()["job_id"]
            time.sleep(1.0)

            # Extract token from headers
            token = headers["Authorization"].replace("Bearer ", "")
            # Download using query param token instead of header
            download_resp = client.get(f"/exports/{job_id}/download?token={token}")
            assert download_resp.status_code == 200


@patch("app.services.export_service._RUST_AVAILABLE", False)
class TestExportsRustUnavailable:
    def test_export_returns_503_when_rust_unavailable(self, client, auth_headers):
        headers, _ = auth_headers
        resp = client.post(
            "/exports",
            json={"format": "csv", "scope": "transactions"},
            headers=headers,
        )
        assert resp.status_code == 503
        assert "Export engine" in resp.json()["detail"]


class TestExportJobCleanup:
    def test_cleanup_removes_expired_jobs(self):
        from app.services.export_service import ExportJob, _jobs, cleanup_expired_jobs

        job = ExportJob(
            id="expired-test",
            user_id="user1",
            status="done",
            format="csv",
            scope="transactions",
            created_at=datetime.now(UTC) - timedelta(hours=1),
            expires_at=datetime.now(UTC) - timedelta(minutes=1),
        )
        _jobs["expired-test"] = job

        cleanup_expired_jobs()
        assert "expired-test" not in _jobs

    def test_cleanup_keeps_active_jobs(self):
        from app.services.export_service import ExportJob, _jobs, cleanup_expired_jobs

        job = ExportJob(
            id="active-test",
            user_id="user1",
            status="done",
            format="csv",
            scope="transactions",
            created_at=datetime.now(UTC),
            expires_at=datetime.now(UTC) + timedelta(minutes=25),
        )
        _jobs["active-test"] = job

        cleanup_expired_jobs()
        assert "active-test" in _jobs
        del _jobs["active-test"]
