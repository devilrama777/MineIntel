"""
MineIntel Phase 4: Topic-First Organization Classifier

Categorizes structured evidence items into key operational and governance topics:
- PRODUCTION_DISPATCH
- SAFETY_ENVIRONMENTAL
- GEOLOGICAL_RESERVES
- FINANCIAL_OPERATIONAL
- EQUIPMENT_INFRASTRUCTURE
- STATUTORY_COMPLIANCE
- GENERAL

Uses deterministic domain ontology with optional Phase 3 local AI assistance.
"""
import logging
import re
from typing import Any, Dict, List, Optional, Set

from backend.services.intelligence_models import TopicCategory

logger = logging.getLogger("mineintel.topic_classifier")

TOPIC_KEYWORDS = {
    TopicCategory.PRODUCTION_DISPATCH.value: [
        "production", "output", "dispatch", "tonnage", "tons", "metric tons",
        "tph", "excavation", "coal extracted", "rake", "wagon", "siding",
        "overburden", "stripping", "haulage"
    ],
    TopicCategory.SAFETY_ENVIRONMENTAL.value: [
        "safety", "hazard", "incident", "accident", "fatal", "injury",
        "air quality", "pm10", "pm2.5", "leachate", "reclamation", "plantation",
        "effluent", "water treatment", "dust suppression", "spoil dump"
    ],
    TopicCategory.GEOLOGICAL_RESERVES.value: [
        "geological", "reserves", "seam", "thickness", "borehole", "strata",
        "overburden ratio", "gross calorific", "gcv", "ash content", "moisture",
        "rank", "lignite", "bituminous", "exploration"
    ],
    TopicCategory.FINANCIAL_OPERATIONAL.value: [
        "cost", "capex", "opex", "royalty", "revenue", "expenditure",
        "billing", "penalty", "financial", "budget", "tariff", "cess"
    ],
    TopicCategory.EQUIPMENT_INFRASTRUCTURE.value: [
        "dumper", "shovel", "dragline", "conveyor", "chp", "crusher",
        "substation", "transformer", "fleet", "haul road", "workshop",
        "machinery", "equipment", "breakdown", "availability"
    ],
    TopicCategory.STATUTORY_COMPLIANCE.value: [
        "statutory", "dgms", "clearance", "environment clearance", "forest clearance",
        "mining lease", "compliance", "violation", "show cause", "consent to operate",
        "cto", "cte", "director general of mines safety"
    ]
}


class TopicClassifier:
    """Classifies evidence into structured operational topics."""

    @classmethod
    def classify_item(cls, item: Dict[str, Any]) -> str:
        """Determines primary topic for an evidence item."""
        text = str(item.get("content_text") or item.get("content") or "").lower()
        prov = item.get("provenance", {}) or {}
        filename = str(prov.get("filename", "")).lower()
        full_text = f"{text} {filename}"

        scores: Dict[str, int] = {}

        for topic, keywords in TOPIC_KEYWORDS.items():
            score = 0
            for kw in keywords:
                if re.search(rf"\b{re.escape(kw)}\b", full_text):
                    score += 1
            if score > 0:
                scores[topic] = score

        if scores:
            best_topic = max(scores.items(), key=lambda x: x[1])[0]
            return best_topic

        return TopicCategory.GENERAL.value

    @classmethod
    def organize_by_topic(cls, items: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """
        Groups evidence item IDs under TopicCategory headings.
        Returns a dictionary mapping topic -> list of evidence_ids.
        """
        result: Dict[str, List[str]] = {cat.value: [] for cat in TopicCategory}

        for it in items:
            ev_id = it.get("evidence_id")
            if not ev_id:
                continue
            topic = cls.classify_item(it)
            result.setdefault(topic, []).append(ev_id)

        # Filter out empty topics
        return {k: v for k, v in result.items() if len(v) > 0}


topic_classifier = TopicClassifier()
