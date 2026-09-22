from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class AgentTaskStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    AWAITING_INPUT = "AWAITING_INPUT"
    VALIDATING = "VALIDATING"
    RETRYING = "RETRYING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class AgentTaskState(BaseModel):
    """
    State representation for an Agent Orchestration task.
    """
    job_id: str = Field(..., description="The unique identifier for the specific job/task.")
    owner_id: str = Field(..., description="The owner_id inheriting from the authenticated user, critical for isolation.")
    status: AgentTaskStatus = Field(default=AgentTaskStatus.PENDING, description="Current execution state of the agent.")
    
    # Compact structured state + references to existing evidence
    structured_state: Dict[str, Any] = Field(default_factory=dict, description="Compact structured state accumulated by the agent.")
    evidence_references: List[str] = Field(default_factory=list, description="List of IDs pointing to existing structured evidence.")
    
    # Conflict policy metadata
    conflict_logs: List[Dict[str, Any]] = Field(default_factory=list, description="Logs documenting conflicts detected across sources.")
    
    # Agent execution history / traces
    execution_history: List[Dict[str, Any]] = Field(default_factory=list, description="History of thoughts, tool calls, and transitions.")
    
    created_at: int = Field(default=0, description="Creation timestamp in milliseconds.")
    updated_at: int = Field(default=0, description="Last update timestamp in milliseconds.")
