import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

from app.db.models import Export


def _make_export(
    db_session,
    user_id,
    name="Test Export",
    fmt="csv",
    scope="transactions",
    file_size=1024,
    s3_key=None,
):
    """Insert an Export record directly into the DB."""
    export_id = uuid.uuid4()
    if s3_key is None:
        s3_key = f"exports/{user_id}/{export_id}.{fmt}"
    record = Export(
        id=export_id,
        user_id=uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
        name=name,
        format=fmt,
        scope=scope,
        file_size=file_size,
        s3_key=s3_key,
        expires_at=datetime.now(UTC) + timedelta(days=180),
    )
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)
    return record


class TestExportHistory:
    def test_history_empty(self, client, auth_headers):
        headers, _ = auth_headers
        resp = client.get("/exports/history", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["exports"] == []
        assert data["total_count"] == 0

    def test_history_returns_records(self, client, auth_headers, db_session):
        headers, user_id = auth_headers
        _make_export(db_session, user_id, name="Export A")
        _make_export(db_session, user_id, name="Export B")

        resp = client.get("/exports/history", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_count"] == 2
        assert len(data["exports"]) == 2
        names = {e["name"] for e in data["exports"]}
        assert names == {"Export A", "Export B"}

    def test_history_requires_auth(self, client):
        resp = client.get("/exports/history")
        assert resp.status_code in (401, 403)

    def test_history_cross_user_isolation(self, client, auth_headers, second_auth, db_session):
        headers1, user_id1 = auth_headers
        headers2, user_id2 = second_auth
        _make_export(db_session, user_id1, name="User 1 Export")
        _make_export(db_session, user_id2, name="User 2 Export")

        resp = client.get("/exports/history", headers=headers1)
        data = resp.json()
        assert data["total_count"] == 1
        assert data["exports"][0]["name"] == "User 1 Export"

    def test_history_pagination(self, client, auth_headers, db_session):
        headers, user_id = auth_headers
        for i in range(5):
            _make_export(db_session, user_id, name=f"Export {i}")

        resp = client.get("/exports/history?limit=2&offset=0", headers=headers)
        data = resp.json()
        assert data["total_count"] == 5
        assert len(data["exports"]) == 2
        assert data["limit"] == 2
        assert data["offset"] == 0

        resp2 = client.get("/exports/history?limit=2&offset=2", headers=headers)
        data2 = resp2.json()
        assert len(data2["exports"]) == 2
        assert data2["total_count"] == 5

    def test_history_limit_capped_at_50(self, client, auth_headers):
        headers, _ = auth_headers
        resp = client.get("/exports/history?limit=100", headers=headers)
        assert resp.status_code == 422


class TestExportDelete:
    def test_delete_export(self, client, auth_headers, db_session):
        headers, user_id = auth_headers
        record = _make_export(db_session, user_id)

        with patch("app.routers.exports.s3_mod") as mock_s3:
            mock_s3.is_s3_available.return_value = False
            resp = client.delete(f"/exports/history/{record.id}", headers=headers)

        assert resp.status_code == 204

        # Verify record is gone
        check = db_session.query(Export).filter(Export.id == record.id).first()
        assert check is None

    def test_delete_wrong_user(self, client, auth_headers, second_auth, db_session):
        _, user_id1 = auth_headers
        headers2, _ = second_auth
        record = _make_export(db_session, user_id1)

        resp = client.delete(f"/exports/history/{record.id}", headers=headers2)
        assert resp.status_code == 404

    def test_delete_nonexistent(self, client, auth_headers):
        headers, _ = auth_headers
        resp = client.delete(f"/exports/history/{uuid.uuid4()}", headers=headers)
        assert resp.status_code == 404

    def test_delete_calls_s3(self, client, auth_headers, db_session):
        headers, user_id = auth_headers
        record = _make_export(db_session, user_id)
        s3_key = record.s3_key

        with patch("app.routers.exports.s3_mod") as mock_s3:
            mock_s3.is_s3_available.return_value = True
            resp = client.delete(f"/exports/history/{record.id}", headers=headers)

        assert resp.status_code == 204
        mock_s3.delete.assert_called_once_with(s3_key)


class TestExportHistoryDownload:
    def test_download_without_s3(self, client, auth_headers, db_session):
        headers, user_id = auth_headers
        record = _make_export(db_session, user_id)
        token = headers["Authorization"].replace("Bearer ", "")

        with patch("app.routers.exports.s3_mod") as mock_s3:
            mock_s3.is_s3_available.return_value = False
            resp = client.get(
                f"/exports/history/{record.id}/download?token={token}",
                follow_redirects=False,
            )

        assert resp.status_code == 503

    def test_download_redirects_to_presigned(self, client, auth_headers, db_session):
        headers, user_id = auth_headers
        record = _make_export(db_session, user_id)
        token = headers["Authorization"].replace("Bearer ", "")

        with patch("app.routers.exports.s3_mod") as mock_s3:
            mock_s3.is_s3_available.return_value = True
            mock_s3.presign_download.return_value = "https://s3.example.com/presigned"
            resp = client.get(
                f"/exports/history/{record.id}/download?token={token}",
                follow_redirects=False,
            )

        assert resp.status_code == 307
        assert resp.headers["location"] == "https://s3.example.com/presigned"
        mock_s3.presign_download.assert_called_once_with(record.s3_key, "Test-Export.csv")

    def test_download_uses_sanitized_export_name(self, client, auth_headers, db_session):
        headers, user_id = auth_headers
        record = _make_export(db_session, user_id, name='Quarterly / "North" : Summary')
        token = headers["Authorization"].replace("Bearer ", "")

        with patch("app.routers.exports.s3_mod") as mock_s3:
            mock_s3.is_s3_available.return_value = True
            mock_s3.presign_download.return_value = "https://s3.example.com/presigned"
            resp = client.get(
                f"/exports/history/{record.id}/download?token={token}",
                follow_redirects=False,
            )

        assert resp.status_code == 307
        mock_s3.presign_download.assert_called_once_with(
            record.s3_key, "Quarterly-North-Summary.csv"
        )

    def test_download_uses_zip_for_full_dump_csv(self, client, auth_headers, db_session):
        headers, user_id = auth_headers
        record = _make_export(db_session, user_id, name="Backup Export", scope="full_dump")
        token = headers["Authorization"].replace("Bearer ", "")

        with patch("app.routers.exports.s3_mod") as mock_s3:
            mock_s3.is_s3_available.return_value = True
            mock_s3.presign_download.return_value = "https://s3.example.com/presigned"
            resp = client.get(
                f"/exports/history/{record.id}/download?token={token}",
                follow_redirects=False,
            )

        assert resp.status_code == 307
        mock_s3.presign_download.assert_called_once_with(record.s3_key, "Backup-Export.zip")

    def test_download_requires_auth(self, client, auth_headers, db_session):
        _, user_id = auth_headers
        record = _make_export(db_session, user_id)
        resp = client.get(f"/exports/history/{record.id}/download", follow_redirects=False)
        assert resp.status_code == 401

    def test_download_wrong_user(self, client, auth_headers, second_auth, db_session):
        _, user_id1 = auth_headers
        headers2, _ = second_auth
        record = _make_export(db_session, user_id1)
        token2 = headers2["Authorization"].replace("Bearer ", "")

        with patch("app.routers.exports.s3_mod") as mock_s3:
            mock_s3.is_s3_available.return_value = True
            resp = client.get(
                f"/exports/history/{record.id}/download?token={token2}",
                follow_redirects=False,
            )

        assert resp.status_code == 404

    def test_download_expired_export_returns_410(self, client, auth_headers, db_session):
        headers, user_id = auth_headers
        record = _make_export(db_session, user_id)
        record.expires_at = datetime.now(UTC) - timedelta(minutes=1)
        db_session.add(record)
        db_session.commit()

        token = headers["Authorization"].replace("Bearer ", "")

        with patch("app.routers.exports.s3_mod") as mock_s3:
            mock_s3.is_s3_available.return_value = True
            resp = client.get(
                f"/exports/history/{record.id}/download?token={token}",
                follow_redirects=False,
            )

        assert resp.status_code == 410
        assert "expired" in resp.json()["detail"].lower()


class TestStorageCap:
    @patch("app.services.export_service._RUST_AVAILABLE", True)
    @patch("app.services.export_service.scribe")
    def test_storage_cap_blocks_new_export(self, mock_scribe, client, auth_headers, db_session):
        headers, user_id = auth_headers
        # Insert exports totalling 100MB
        _make_export(db_session, user_id, name="Big export", file_size=100 * 1024 * 1024)

        with patch("app.routers.exports.s3_mod") as mock_s3:
            mock_s3.is_s3_available.return_value = True
            resp = client.post(
                "/exports",
                json={"format": "csv", "scope": "transactions"},
                headers=headers,
            )

        assert resp.status_code == 409
        assert "storage limit" in resp.json()["detail"].lower()

    @patch("app.services.export_service._RUST_AVAILABLE", True)
    @patch("app.services.export_service.scribe")
    def test_under_cap_allows_export(
        self, mock_scribe, client, auth_headers, db_session, system_categories
    ):
        headers, user_id = auth_headers
        mock_scribe.export_csv.return_value = b"data"
        _make_export(db_session, user_id, name="Small export", file_size=1024)

        with patch("app.routers.exports.s3_mod") as mock_s3:
            mock_s3.is_s3_available.return_value = True
            resp = client.post(
                "/exports",
                json={"format": "csv", "scope": "transactions"},
                headers=headers,
            )

        assert resp.status_code == 202


class TestExportName:
    @patch("app.services.export_service._RUST_AVAILABLE", True)
    @patch("app.services.export_service.scribe")
    def test_custom_name_accepted(self, mock_scribe, client, auth_headers, system_categories):
        headers, _ = auth_headers
        mock_scribe.export_csv.return_value = b"data"

        resp = client.post(
            "/exports",
            json={"format": "csv", "scope": "transactions", "name": "My Custom Export"},
            headers=headers,
        )
        assert resp.status_code == 202

    @patch("app.services.export_service._RUST_AVAILABLE", True)
    @patch("app.services.export_service.scribe")
    def test_name_too_long_rejected(self, mock_scribe, client, auth_headers):
        headers, _ = auth_headers
        resp = client.post(
            "/exports",
            json={"format": "csv", "scope": "transactions", "name": "x" * 121},
            headers=headers,
        )
        assert resp.status_code == 422
