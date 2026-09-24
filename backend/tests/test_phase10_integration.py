import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_cors_headers():
    # Options request to check CORS
    response = client.options(
        "/api/health/ready",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET"
        }
    )
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers
    
    origin = response.headers["access-control-allow-origin"]
    assert origin == "*" or origin == "http://localhost:3000"

def test_health_ready_endpoint():
    with patch("backend.auth_store.is_postgres_configured", return_value=True), \
         patch("backend.auth_store._get_pg_connection") as mock_get_pg, \
         patch("backend.services.ai_providers.registry.get_provider") as mock_get_provider:
         
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur
        mock_get_pg.return_value = mock_conn
        
        mock_provider = MagicMock()
        mock_provider.is_available.return_value = True
        mock_provider.get_status.return_value = {
            "text_model_ready": True,
            "vl_model_ready": True
        }
        mock_provider.default_text_model = "test-text-model"
        mock_provider.default_vl_model = "test-vl-model"
        mock_get_provider.return_value = mock_provider
        
        response = client.get("/api/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert data["database"] == "connected"
        
        mock_cur.execute.assert_called_once_with("SELECT 1")

def test_health_ready_db_failure():
    with patch("backend.auth_store.is_postgres_configured", return_value=True), \
         patch("backend.auth_store._get_pg_connection", side_effect=Exception("DB down")), \
         patch("backend.services.ai_providers.registry.get_provider") as mock_get_provider:
         
        mock_provider = MagicMock()
        mock_provider.is_available.return_value = True
        mock_provider.get_status.return_value = {
            "text_model_ready": True,
            "vl_model_ready": True
        }
        mock_get_provider.return_value = mock_provider
        
        response = client.get("/api/health/ready")
        assert response.status_code == 503
        assert "Database connection failed" in response.json()["detail"]

def test_health_ready_model_unavailable():
    with patch("backend.services.ai_providers.registry.get_provider") as mock_get_provider:
        mock_provider = MagicMock()
        mock_provider.is_available.return_value = False
        mock_get_provider.return_value = mock_provider
        
        response = client.get("/api/health/ready")
        assert response.status_code == 503
        assert "Ollama service is unavailable" in response.json()["detail"]

def test_health_ready_models_missing():
    with patch("backend.services.ai_providers.registry.get_provider") as mock_get_provider:
        mock_provider = MagicMock()
        mock_provider.is_available.return_value = True
        mock_provider.get_status.return_value = {
            "text_model_ready": False,
            "vl_model_ready": True
        }
        mock_provider.default_text_model = "test-text-model"
        mock_provider.default_vl_model = "test-vl-model"
        mock_get_provider.return_value = mock_provider
        
        response = client.get("/api/health/ready")
        assert response.status_code == 503
        assert "Required Ollama models missing: test-text-model" in response.json()["detail"]
