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

class WorkflowStage(str, Enum):
    LOAD_MANIFEST = "LOAD_MANIFEST"
    VERIFY_INGESTION = "VERIFY_INGESTION"
    EVIDENCE_ANALYSIS = "EVIDENCE_ANALYSIS"
    INTELLIGENCE_ANALYSIS = "INTELLIGENCE_ANALYSIS"
    CHART_ANALYSIS = "CHART_ANALYSIS"
    PLANNING = "PLANNING"
    VALIDATE_PLAN = "VALIDATE_PLAN"
    WRITING = "WRITING"
    VALIDATE_REPORT_DATA = "VALIDATE_REPORT_DATA"
    COMPILE_MARKDOWN_ARTIFACT = "COMPILE_MARKDOWN_ARTIFACT"
    VERIFY_ARTIFACT = "VERIFY_ARTIFACT"
    COMPLETED = "COMPLETED"

class StructuredError(BaseModel):
    code: str
    message: str
    stage: Optional[str] = None
    tool: Optional[str] = None
    retryable: bool = False
    timestamp: int = 0

class AgentTaskState(BaseModel):
    """
    State representation for an Agent Orchestration task.
    Enforces deterministic workflow lifecycle, heartbeat tracking,
    and structured error propagation.
    """
    task_id: str = Field(..., description="The unique identifier for the specific job/task.")
    owner_id: str = Field(..., description="The owner_id inheriting from the authenticated user, critical for isolation.")
    status: AgentTaskStatus = Field(default=AgentTaskStatus.PENDING, description="Current execution state of the agent.")
    
    # Execution lifecycle timestamps
    created_at: int = Field(default=0, description="Creation timestamp in milliseconds.")
    started_at: Optional[int] = Field(default=None, description="Execution start timestamp in milliseconds.")
    heartbeat_at: Optional[int] = Field(default=None, description="Heartbeat timestamp in milliseconds.")
    updated_at: int = Field(default=0, description="Last update timestamp in milliseconds.")
    
    # Structured error if failed
    error: Optional[StructuredError] = Field(default=None, description="Structured error details when task fails.")
    
    # Compact structured state + references to existing evidence
    structured_state: Dict[str, Any] = Field(default_factory=dict, description="Compact structured state accumulated by the agent.")
    evidence_references: List[str] = Field(default_factory=list, description="List of IDs pointing to existing structured evidence.")
    
    # Conflict policy metadata
    conflict_logs: List[Dict[str, Any]] = Field(default_factory=list, description="Logs documenting conflicts detected across sources.")
    
    # Agent execution history / traces (safe structured events only, no raw chain-of-thought)
    execution_history: List[Dict[str, Any]] = Field(default_factory=list, description="History of thoughts, tool calls, and transitions.")
