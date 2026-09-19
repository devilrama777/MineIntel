"""
MineIntel Phase 9: User-Specific Learning & Feedback Layer Models

Defines typed schemas for:
- Learning feedback events capturing original AI output and subsequent user edits
- Chart selection, modification, and rejection feedback
- User-specific learned preferences (style, terminology, formatting, charts)
- Audit traceability linking every learned rule to the events that produced it
- Offline fine-tuning dataset export structures
"""

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class FeedbackEventType(str, Enum):
    SECTION_EDIT = "section_edit"
    CHART_SELECTION = "chart_selection"
    CHART_REJECTION = "chart_rejection"
    CONTENT_ACCEPT = "content_accept"
    CONTENT_REJECT = "content_reject"
    TERMINOLOGY_CORRECTION = "terminology_correction"
    STYLE_PREFERENCE = "style_preference"


@dataclass
class LearningFeedbackEvent:
    event_id: str
    user_id: str
    job_id: str
    report_id: str
    event_type: str
    plan_id: Optional[str] = None
    section_id: Optional[str] = None
    section_topic: Optional[str] = None
    original_text: Optional[str] = None
    edited_text: Optional[str] = None
    evidence_ids: List[str] = field(default_factory=list)
    chart_id: Optional[str] = None
    chart_type: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
    created_at: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LearningFeedbackEvent":
        return cls(
            event_id=data.get("event_id", ""),
            user_id=data.get("user_id", ""),
            job_id=data.get("job_id", ""),
            report_id=data.get("report_id", ""),
            event_type=data.get("event_type", FeedbackEventType.SECTION_EDIT.value),
            plan_id=data.get("plan_id"),
            section_id=data.get("section_id"),
            section_topic=data.get("section_topic"),
            original_text=data.get("original_text"),
            edited_text=data.get("edited_text"),
            evidence_ids=data.get("evidence_ids", []),
            chart_id=data.get("chart_id"),
            chart_type=data.get("chart_type"),
            details=data.get("details", {}),
            created_at=int(data.get("created_at", 0))
        )


@dataclass
class LearnedPreference:
    preference_id: str
    user_id: str
    category: str  # "terminology", "style", "chart_preference", "section_preference"
    key: str
    value: Any
    confidence: float = 0.5  # Scales from 0.0 to 1.0 with repeated evidence
    occurrence_count: int = 1
    supporting_event_ids: List[str] = field(default_factory=list)
    created_at: int = 0
    updated_at: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LearnedPreference":
        return cls(
            preference_id=data.get("preference_id", ""),
            user_id=data.get("user_id", ""),
            category=data.get("category", ""),
            key=data.get("key", ""),
            value=data.get("value"),
            confidence=float(data.get("confidence", 0.5)),
            occurrence_count=int(data.get("occurrence_count", 1)),
            supporting_event_ids=data.get("supporting_event_ids", []),
            created_at=int(data.get("created_at", 0)),
            updated_at=int(data.get("updated_at", 0))
        )


@dataclass
class UserLearningProfile:
    user_id: str
    preferences: Dict[str, LearnedPreference] = field(default_factory=dict)
    total_events_captured: int = 0
    accepted_edits_count: int = 0
    terminology_rules: Dict[str, str] = field(default_factory=dict)
    style_preferences: Dict[str, Any] = field(default_factory=dict)
    chart_preferences: Dict[str, str] = field(default_factory=dict)
    updated_at: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "preferences": {k: v.to_dict() if isinstance(v, LearnedPreference) else v for k, v in self.preferences.items()},
            "total_events_captured": self.total_events_captured,
            "accepted_edits_count": self.accepted_edits_count,
            "terminology_rules": self.terminology_rules,
            "style_preferences": self.style_preferences,
            "chart_preferences": self.chart_preferences,
            "updated_at": self.updated_at
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "UserLearningProfile":
        raw_prefs = data.get("preferences", {})
        prefs = {
            k: LearnedPreference.from_dict(v) if isinstance(v, dict) else v
            for k, v in raw_prefs.items()
        }
        return cls(
            user_id=data.get("user_id", ""),
            preferences=prefs,
            total_events_captured=int(data.get("total_events_captured", 0)),
            accepted_edits_count=int(data.get("accepted_edits_count", 0)),
            terminology_rules=data.get("terminology_rules", {}),
            style_preferences=data.get("style_preferences", {}),
            chart_preferences=data.get("chart_preferences", {}),
            updated_at=int(data.get("updated_at", 0))
        )
