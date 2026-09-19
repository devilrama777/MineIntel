"""
MineIntel Phase 9: User-Specific Learning & Feedback Service Orchestrator

Captures editing feedback, learns user preferences, and generates contextual guidance:
- Records section edits, terminology corrections, and chart selections/rejections
- Builds audit-traceable user profiles (confidence increases with repeated signals)
- Provides contextual guidance for future report planning/generation (never alters source facts)
- Exports approved edit pairs into supervised fine-tuning datasets for offline training
- Enforces strict user isolation and ownership lifecycle deletion
"""

import difflib
import logging
import re
import time
from typing import Any, Dict, List, Optional, Tuple

from backend.services.learning_models import (
    FeedbackEventType,
    LearnedPreference,
    LearningFeedbackEvent,
    UserLearningProfile,
)
from backend.services.learning_store import (
    delete_user_learning_data as store_delete_user_data,
    get_user_profile as store_get_profile,
    list_events_for_user as store_list_events,
    save_learning_event as store_save_event,
    save_user_profile as store_save_profile,
)

logger = logging.getLogger("mineintel.learning_service")


class LearningService:
    """Manages user-specific learning, preference aggregation, and fine-tuning exports."""

    def record_edit_feedback(
        self,
        user_id: str,
        report_id: str,
        job_id: str,
        section_id: str,
        original_text: str,
        edited_text: str,
        plan_id: Optional[str] = None,
        section_topic: Optional[str] = None,
        evidence_ids: Optional[List[str]] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> LearningFeedbackEvent:
        """
        Captures a user edit event, derives stylistic & terminology signals,
        and updates the user's isolated profile.
        """
        now_ms = int(time.time() * 1000)
        event_id = f"evt_{user_id[:8]}_{now_ms}"
        evidence_ids = evidence_ids or []
        details = details or {}

        event = LearningFeedbackEvent(
            event_id=event_id,
            user_id=user_id,
            job_id=job_id,
            report_id=report_id,
            plan_id=plan_id,
            event_type=FeedbackEventType.SECTION_EDIT.value,
            section_id=section_id,
            section_topic=section_topic or "General Audit",
            original_text=original_text,
            edited_text=edited_text,
            evidence_ids=evidence_ids,
            details=details,
            created_at=now_ms
        )

        store_save_event(event.to_dict())

        # Derive preference signals
        self._update_profile_from_edit(user_id, event)
        return event

    def record_chart_feedback(
        self,
        user_id: str,
        report_id: str,
        job_id: str,
        chart_id: str,
        chart_type: str,
        action: str = "accepted",  # "accepted", "rejected", "modified"
        details: Optional[Dict[str, Any]] = None
    ) -> LearningFeedbackEvent:
        """Records chart acceptance, modification, or rejection feedback."""
        now_ms = int(time.time() * 1000)
        event_id = f"evt_{user_id[:8]}_{now_ms}"
        details = details or {}

        ev_type = FeedbackEventType.CHART_SELECTION.value if action == "accepted" else FeedbackEventType.CHART_REJECTION.value
        event = LearningFeedbackEvent(
            event_id=event_id,
            user_id=user_id,
            job_id=job_id,
            report_id=report_id,
            event_type=ev_type,
            chart_id=chart_id,
            chart_type=chart_type,
            details={"action": action, **details},
            created_at=now_ms
        )
        store_save_event(event.to_dict())

        # Update chart preferences
        profile = self._get_or_create_profile(user_id)
        metric_name = details.get("metric_name", "general")
        if action == "accepted":
            profile.chart_preferences[metric_name] = chart_type
        elif action == "rejected" and profile.chart_preferences.get(metric_name) == chart_type:
            del profile.chart_preferences[metric_name]

        profile.total_events_captured += 1
        profile.updated_at = now_ms
        store_save_profile(profile.to_dict())
        return event

    def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """Retrieves user learning profile with preferences and rule stats."""
        profile = self._get_or_create_profile(user_id)
        return profile.to_dict()

    def update_user_preferences(
        self,
        user_id: str,
        style_preferences: Optional[Dict[str, Any]] = None,
        terminology_rules: Optional[Dict[str, str]] = None,
        chart_preferences: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Allows direct user customization of learned preferences."""
        profile = self._get_or_create_profile(user_id)
        now_ms = int(time.time() * 1000)

        if style_preferences is not None:
            profile.style_preferences.update(style_preferences)
        if terminology_rules is not None:
            profile.terminology_rules.update(terminology_rules)
        if chart_preferences is not None:
            profile.chart_preferences.update(chart_preferences)

        profile.updated_at = now_ms
        store_save_profile(profile.to_dict())
        return profile.to_dict()

    def get_contextual_guidance(self, user_id: str, topic: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns learned guidance for planners and generation prompts.
        MANDATORY: Marked as contextual guidance only; never mutates raw evidence.
        """
        profile = self._get_or_create_profile(user_id)
        return {
            "is_contextual_guidance": True,
            "user_id": user_id,
            "topic": topic,
            "style_preferences": profile.style_preferences,
            "terminology_rules": profile.terminology_rules,
            "chart_preferences": profile.chart_preferences,
            "total_feedback_signals": profile.total_events_captured
        }

    def list_user_events(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Returns chronological feedback audit trail for the authenticated user."""
        return store_list_events(user_id=user_id, limit=limit)

    def export_fine_tuning_dataset(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Extracts approved revision pairs (prompt/context, original_output, user_edited_output)
        suitable for supervised fine-tuning. Does NOT run automatic fine-tuning.
        """
        events = store_list_events(user_id=user_id, limit=500)
        export_items: List[Dict[str, Any]] = []

        for ev in events:
            if ev.get("event_type") == FeedbackEventType.SECTION_EDIT.value:
                orig = ev.get("original_text", "").strip()
                edit = ev.get("edited_text", "").strip()
                if orig and edit and orig != edit:
                    export_items.append({
                        "instruction": "Draft a formal regulatory mining audit section grounded in verified evidence.",
                        "input_context": f"Topic: {ev.get('section_topic', 'Audit')}\nEvidence IDs: {', '.join(ev.get('evidence_ids', []))}",
                        "original_ai_output": orig,
                        "user_edited_output": edit,
                        "provenance_ids": ev.get("evidence_ids", []),
                        "event_id": ev.get("event_id"),
                        "created_at": ev.get("created_at")
                    })

        logger.info(f"Exported {len(export_items)} fine-tuning training items for user {user_id}")
        return export_items

    def delete_user_learning_data(self, user_id: str) -> bool:
        """Deletes all learning records for a user."""
        return store_delete_user_data(user_id=user_id)

    # -------------------------------------------------------------------------
    # Internal Heuristics for Feedback Extraction
    # -------------------------------------------------------------------------
    def _get_or_create_profile(self, user_id: str) -> UserLearningProfile:
        p_dict = store_get_profile(user_id)
        if p_dict:
            return UserLearningProfile.from_dict(p_dict)
        p = UserLearningProfile(user_id=user_id, updated_at=int(time.time() * 1000))
        store_save_profile(p.to_dict())
        return p

    def _update_profile_from_edit(self, user_id: str, event: LearningFeedbackEvent) -> None:
        profile = self._get_or_create_profile(user_id)
        orig = event.original_text or ""
        edit = event.edited_text or ""
        now_ms = int(time.time() * 1000)

        profile.total_events_captured += 1
        profile.accepted_edits_count += 1

        # 1. Detect formatting / style preference: bullet points vs paragraph
        orig_bullets = orig.count("\n- ") + orig.count("\n* ")
        edit_bullets = edit.count("\n- ") + edit.count("\n* ")
        if edit_bullets > orig_bullets and edit_bullets >= 2:
            profile.style_preferences["format_style"] = "bulleted_findings"
            pref = profile.preferences.setdefault(
                "style_bulleted_findings",
                LearnedPreference(
                    preference_id=f"pref_style_{user_id[:6]}_bullets",
                    user_id=user_id,
                    category="style",
                    key="format_style",
                    value="bulleted_findings",
                    confidence=0.6,
                    occurrence_count=0,
                    supporting_event_ids=[]
                )
            )
            pref.occurrence_count += 1
            pref.confidence = min(0.95, pref.confidence + 0.1)
            pref.supporting_event_ids.append(event.event_id)
            pref.updated_at = now_ms

        # 2. Detect conciseness preference
        if len(edit) < 0.65 * len(orig) and len(orig) > 100:
            profile.style_preferences["conciseness"] = "high"
        elif len(edit) > 1.4 * len(orig) and len(orig) > 50:
            profile.style_preferences["conciseness"] = "detailed"

        # 3. Detect systematic terminology replacement (single word/acronym substitutes)
        # Using difflib to find deleted and added tokens
        orig_words = re.findall(r"\b[A-Za-z0-9\-_]{2,}\b", orig)
        edit_words = re.findall(r"\b[A-Za-z0-9\-_]{2,}\b", edit)
        matcher = difflib.SequenceMatcher(None, orig_words, edit_words)
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "replace" and (i2 - i1) == 1 and (j2 - j1) == 1:
                old_w = orig_words[i1]
                new_w = edit_words[j1]
                if old_w.lower() != new_w.lower():
                    rule_key = f"term_{old_w}"
                    profile.terminology_rules[old_w] = new_w
                    pref = profile.preferences.setdefault(
                        rule_key,
                        LearnedPreference(
                            preference_id=f"pref_{user_id[:6]}_{rule_key}",
                            user_id=user_id,
                            category="terminology",
                            key=old_w,
                            value=new_w,
                            confidence=0.5,
                            occurrence_count=0,
                            supporting_event_ids=[]
                        )
                    )
                    pref.occurrence_count += 1
                    pref.confidence = min(0.95, pref.confidence + 0.15)
                    pref.supporting_event_ids.append(event.event_id)
                    pref.updated_at = now_ms

        profile.updated_at = now_ms
        store_save_profile(profile.to_dict())


learning_service = LearningService()
