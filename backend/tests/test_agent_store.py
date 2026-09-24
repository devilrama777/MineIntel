import pytest
from unittest.mock import patch, MagicMock
from backend.services.agent.agent_store import create_task, get_task
from backend.services.agent.agent_models import AgentTaskState, AgentTaskStatus


@patch("backend.services.agent.agent_store.is_postgres_configured")
@patch("backend.services.agent.agent_store._get_pg_connection")
@patch("backend.services.agent.agent_store.init_agent_schema")
def test_create_and_get_agent_state_success(mock_init, mock_get_conn, mock_is_pg):
    mock_is_pg.return_value = True

    # Setup mock connection and cursor
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_get_conn.return_value.__enter__.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    state = AgentTaskState(
        task_id="test-job-123",
        owner_id="owner-456",
        status=AgentTaskStatus.RUNNING,
        structured_state={"key": "value"},
        evidence_references=["ev1", "ev2"]
    )

    # Test Save
    create_task(state.model_dump())
    
    mock_cursor.execute.assert_called()
    call_args = mock_cursor.execute.call_args[0]
    assert "INSERT INTO mineintel_agent_state" in call_args[0]
    assert call_args[1][0] == "test-job-123"
    assert call_args[1][1] == "owner-456"
    assert call_args[1][2] == "RUNNING"
    
    mock_conn.commit.assert_called_once()

    # Test Get (simulate DB row return)
    mock_cursor.fetchone.return_value = (
        "test-job-123", "owner-456", "RUNNING",
        '{"key": "value"}', '["ev1", "ev2"]', '[]', '[]',
        1000, 1000
    )

    result = get_task("test-job-123", "owner-456")
    assert result is not None
    assert result["task_id"] == "test-job-123"
    assert result["owner_id"] == "owner-456"
    assert result["status"] == "RUNNING"
    assert result["structured_state"] == {"key": "value"}
    assert result["evidence_references"] == ["ev1", "ev2"]


@patch("backend.services.agent.agent_store.is_postgres_configured")
@patch("backend.services.agent.agent_store._get_pg_connection")
def test_get_task_owner_isolation(mock_get_conn, mock_is_pg):
    mock_is_pg.return_value = True

    # Setup mock connection and cursor
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_get_conn.return_value.__enter__.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    # Simulate DB returning no row when owner_id mismatches (enforced by the query)
    mock_cursor.fetchone.return_value = None

    result = get_task("test-job-123", "wrong-owner")
    assert result is None
    mock_cursor.execute.assert_called()
    
    # Assert query had BOTH task_id and owner_id in the where clause params
    call_args = mock_cursor.execute.call_args[0]
    assert "WHERE task_id = %s AND owner_id = %s" in call_args[0]
    assert call_args[1] == ("test-job-123", "wrong-owner")

@patch("backend.services.agent.agent_store.is_postgres_configured")
def test_create_task_fails_no_postgres(mock_is_pg):
    # Simulate neon not configured
    mock_is_pg.return_value = False
    
    state = AgentTaskState(
        task_id="test-job-123",
        owner_id="owner-456",
        status=AgentTaskStatus.RUNNING
    )
    
    with pytest.raises(RuntimeError, match="PostgreSQL is not configured."):
        create_task(state.model_dump())
