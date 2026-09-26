"""
MineIntel Phase 4: Conflict Intelligence Engine

Detects discrepancies and contradictions between evidence items:
- Numerical variance (> 1% discrepancy between reported metrics)
- Factual and statutory contradictions (e.g. compliant vs non-compliant)
- Source-priority weighting to recommend authoritative resolution
- Explicit audit review flags citing conflicting sources
"""
import hashlib
import logging
import re
import time
from typing import Any, Dict, List, Optional, Tuple

from backend.services.intelligence_models import (
    ConflictSeverity,
    ConflictType,
    EvidenceConflict,
    SourcePriority,
)

logger = logging.getLogger("mineintel.conflicts")


class ConflictDetector:
    """Detects and resolves conflicts across multi-source evidence items."""

    # Common mining metrics and patterns to monitor
    METRIC_PATTERNS = [
        (r"(?:coal\s+)?production(?:\s+tonnage)?", "coal_production"),
        (r"overburden(?:\s+removal)?", "overburden_removal"),
        (r"dispatch(?:\s+tonnage)?", "coal_dispatch"),
        (r"stripping\s+ratio", "stripping_ratio"),
        (r"ash(?:\s+content)?", "ash_percentage"),
        (r"reserve(?:s)?(?:\s+tonnage)?", "geological_reserves"),
        (r"seam\s+thickness", "seam_thickness"),
        (r"manpower|headcount", "manpower_strength"),
        (r"explosive(?:s)?(?:\s+usage)?", "explosives_consumed")
    ]

    COMPLIANCE_PATTERNS = [
        (r"\b(fully\s+compliant|in\s+compliance|statutory\s+clearance\s+granted)\b", "COMPLIANT"),
        (r"\b(non-compliant|violation|show\s+cause\s+notice|cessation\s+order)\b", "NON_COMPLIANT")
    ]

    @classmethod
    def _extract_number_and_unit(cls, text: str) -> Optional[Tuple[float, str]]:
        """Extracts primary floating-point figure from text, ignoring date patterns."""
        # Strip ISO and slashed dates so 2024-02-10 does not mask 1250 MT
        clean_text = re.sub(r"\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b", " ", text)
        clean_text = re.sub(r"\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b", " ", clean_text)
        clean_text = clean_text.replace(",", "")

        # Prefer numbers followed by metric units
        m_unit = re.search(r"(\d+(?:\.\d+)?)\s*(mt|metric\s+tons?|tonnes?|tph|m|meters?|%|lakh\s+tonnes?)\b", clean_text, re.IGNORECASE)
        if m_unit:
            return float(m_unit.group(1)), m_unit.group(2).strip().lower()

        m = re.search(r"(\d+(?:\.\d+)?)\b", clean_text)
        if m:
            val = float(m.group(1))
            return val, ""
        return None

    @classmethod
    def _extract_metric_number_and_unit(
        cls,
        item: Dict[str, Any],
        text: str,
        pattern: str
    ) -> Optional[Tuple[float, str]]:
        """
        Extracts the numerical figure associated specifically with the matched metric.
        First inspects structured content_json keys; then proximate numbers in text;
        falling back to general number extraction.
        """
        # 1. Structured content_json inspection (e.g. tabular ledgers)
        c_json = item.get("content_json")
        if isinstance(c_json, dict):
            for k, v in c_json.items():
                if re.search(pattern, str(k).lower()):
                    if isinstance(v, (int, float)) and not isinstance(v, bool):
                        unit = "t" if "_t" in str(k).lower() else ""
                        return float(v), unit
                    elif isinstance(v, str):
                        clean_v = v.replace(",", "").strip()
                        m_v = re.search(r"^(\d+(?:\.\d+)?)\s*(mt|metric\s+tons?|tonnes?|tph|m|meters?|%|lakh\s+tonnes?)?", clean_v, re.IGNORECASE)
                        if m_v:
                            return float(m_v.group(1)), (m_v.group(2) or "").strip().lower()

        # 2. Look for numerical figure in the immediate vicinity of the metric keyword in text
        # e.g. "rom_production_t=215000", "production: 205,000 tonnes", "production of 205,000"
        m_prox = re.search(rf"{pattern}[^\d\n\r,;]*[:=\s]+(\d+(?:,\d+)*(?:\.\d+)?)\s*(mt|metric\s+tons?|tonnes?|tph|m|meters?|%|lakh\s+tonnes?)?", text, re.IGNORECASE)
        if m_prox:
            num = float(m_prox.group(1).replace(",", ""))
            unit = (m_prox.group(2) or "").strip().lower()
            return num, unit

        # 3. Fallback: clean text and general extraction
        return cls._extract_number_and_unit(text)

    @classmethod
    def _get_item_priority(cls, item: Dict[str, Any]) -> int:
        classification = str(item.get("classification", ""))
        layer = str(item.get("layer", ""))
        source_type = (item.get("provenance") or {}).get("source_type", "")

        if "CALCULATED" in classification or source_type in ["csv", "xlsx"]:
            return SourcePriority.AUDITED_CALCULATION.value
        elif "LOCKED FACT" in classification and source_type == "pdf":
            return SourcePriority.STATUTORY_REGULATORY_PDF.value
        elif source_type in ["csv", "xlsx"]:
            return SourcePriority.OPERATIONAL_LOG_CSV.value
        elif source_type in ["docx", "doc"]:
            return SourcePriority.NARRATIVE_DOCX.value
        elif source_type == "image":
            return SourcePriority.IMAGE_EVIDENCE.value
        elif layer == "derived" or "AI" in classification:
            return SourcePriority.AI_DERIVATION.value
        return 50

    @classmethod
    def detect_conflicts(cls, items: List[Dict[str, Any]], job_id: str, owner_id: str) -> List[EvidenceConflict]:
        """
        Scans evidence items for quantitative discrepancies and statutory contradictions.
        Returns a list of EvidenceConflict records.
        """
        conflicts: List[EvidenceConflict] = []

        # 1. Group items by detected metric
        metric_buckets: Dict[str, List[Dict[str, Any]]] = {}

        for it in items:
            text = str(it.get("content_text") or it.get("content") or "").lower()
            c_json = it.get("content_json")
            for pattern, metric_key in cls.METRIC_PATTERNS:
                json_match = False
                if isinstance(c_json, dict):
                    json_match = any(re.search(pattern, str(k).lower()) for k in c_json.keys())

                if re.search(pattern, text) or json_match:
                    num_unit = cls._extract_metric_number_and_unit(it, text, pattern)
                    if num_unit:
                        val, unit = num_unit
                        item_entry = {
                            "item": it,
                            "value": val,
                            "unit": unit,
                            "metric": metric_key
                        }
                        metric_buckets.setdefault(metric_key, []).append(item_entry)
                    break

        # 2. Analyze numerical variances
        for metric_key, entries in metric_buckets.items():
            if len(entries) < 2:
                continue

            # Group items by numerical value to eliminate comparisons between identical values
            # Preserves all entries, all evidence IDs, and all metadata without any top-N cap
            value_groups: Dict[float, List[Dict[str, Any]]] = {}
            for e in entries:
                val_key = round(float(e["value"]), 6)
                value_groups.setdefault(val_key, []).append(e)

            distinct_values = sorted(value_groups.keys())
            if len(distinct_values) < 2:
                # All entries for this metric share identical values (variance <= 0)
                continue

            seen_pairs = set()
            for i in range(len(distinct_values)):
                v1 = distinct_values[i]
                for j in range(i + 1, len(distinct_values)):
                    v2 = distinct_values[j]

                    max_v = max(abs(v1), abs(v2))
                    if max_v <= 0:
                        continue

                    variance = abs(v1 - v2) / max_v
                    if variance <= 0.01:  # 1% or less cannot produce a conflict
                        continue

                    var_pct = round(variance * 100.0, 2)
                    severity = (
                        ConflictSeverity.CRITICAL.value if var_pct > 25.0
                        else (ConflictSeverity.HIGH.value if var_pct > 10.0 else ConflictSeverity.MEDIUM.value)
                    )

                    for e1 in value_groups[v1]:
                        id1 = e1["item"].get("evidence_id")
                        p1 = cls._get_item_priority(e1["item"])
                        src1 = (e1["item"].get("provenance") or {}).get("filename") or e1["item"].get("file_id") or "Source A"

                        for e2 in value_groups[v2]:
                            id2 = e2["item"].get("evidence_id")
                            if id1 == id2:
                                continue

                            pair_key = tuple(sorted([id1, id2]))
                            if pair_key in seen_pairs:
                                continue
                            seen_pairs.add(pair_key)

                            p2 = cls._get_item_priority(e2["item"])
                            src2 = (e2["item"].get("provenance") or {}).get("filename") or e2["item"].get("file_id") or "Source B"

                            # Source priority recommendation
                            if p1 >= p2:
                                rec_item = e1["item"]
                                rec_val = e1["value"]
                                rationale = f"Source {id1} has higher authority rank ({p1} vs {p2}) for metric {metric_key}."
                            else:
                                rec_item = e2["item"]
                                rec_val = e2["value"]
                                rationale = f"Source {id2} has higher authority rank ({p2} vs {p1}) for metric {metric_key}."

                            conflict_id = f"CONF-{hashlib.sha256(f'{id1}:{id2}:{metric_key}'.encode()).hexdigest()[:10].upper()}"

                            conflict = EvidenceConflict(
                                conflict_id=conflict_id,
                                job_id=job_id,
                                owner_id=owner_id,
                                conflict_type=ConflictType.NUMERICAL_VARIANCE.value,
                                severity=severity,
                                topic="PRODUCTION_DISPATCH" if "production" in metric_key or "dispatch" in metric_key else "GENERAL",
                                entity_or_metric=metric_key,
                                conflicting_evidence_ids=[id1, id2],
                                evidence_values=[
                                    {"evidence_id": id1, "value": e1["value"], "unit": e1["unit"], "source": src1, "priority": p1},
                                    {"evidence_id": id2, "value": e2["value"], "unit": e2["unit"], "source": src2, "priority": p2}
                                ],
                                variance_pct=var_pct,
                                recommended_evidence_id=rec_item.get("evidence_id"),
                                recommended_value=rec_val,
                                resolution_rationale=rationale,
                                status="flagged_for_review",
                                review_flag={
                                    "flag": "AUDIT_NUMERICAL_DISCREPANCY",
                                    "message": f"Metric '{metric_key}' has {var_pct}% variance between {src1} ({e1['value']}) and {src2} ({e2['value']}).",
                                    "requires_auditor_signoff": severity in [ConflictSeverity.CRITICAL.value, ConflictSeverity.HIGH.value]
                                },
                                created_at=int(time.time() * 1000)
                            )
                            conflicts.append(conflict)

        # 3. Analyze statutory compliance contradictions
        compliance_entries = []
        for it in items:
            text = str(it.get("content_text") or it.get("content") or "").lower()
            for pattern, status_val in cls.COMPLIANCE_PATTERNS:
                if re.search(pattern, text):
                    compliance_entries.append({
                        "item": it,
                        "status": status_val,
                        "text": text[:100]
                    })
                    break

        has_compliant = [e for e in compliance_entries if e["status"] == "COMPLIANT"]
        has_non_compliant = [e for e in compliance_entries if e["status"] == "NON_COMPLIANT"]

        if has_compliant and has_non_compliant:
            c_item = has_compliant[0]["item"]
            nc_item = has_non_compliant[0]["item"]
            id1 = c_item.get("evidence_id")
            id2 = nc_item.get("evidence_id")
            src1 = (c_item.get("provenance") or {}).get("filename", "Source Compliant")
            src2 = (nc_item.get("provenance") or {}).get("filename", "Source Violation")

            conflict_id = f"CONF-{hashlib.sha256(f'{id1}:{id2}:compliance'.encode()).hexdigest()[:10].upper()}"

            conflict = EvidenceConflict(
                conflict_id=conflict_id,
                job_id=job_id,
                owner_id=owner_id,
                conflict_type=ConflictType.STATUTORY_DIVERGENCE.value,
                severity=ConflictSeverity.CRITICAL.value,
                topic="STATUTORY_COMPLIANCE",
                entity_or_metric="statutory_clearance",
                conflicting_evidence_ids=[id1, id2],
                evidence_values=[
                    {"evidence_id": id1, "value": "COMPLIANT", "source": src1},
                    {"evidence_id": id2, "value": "NON_COMPLIANT", "source": src2}
                ],
                recommended_evidence_id=id2,  # Recommend conservative safety stance
                recommended_value="NON_COMPLIANT",
                resolution_rationale="Statutory conflict: Conservative regulatory oversight requires investigating non-compliance flag.",
                status="flagged_for_review",
                review_flag={
                    "flag": "STATUTORY_CLEARANCE_CONTRADICTION",
                    "message": f"Contradiction detected: {src1} claims compliance whereas {src2} cites non-compliance / violation.",
                    "requires_auditor_signoff": True
                },
                created_at=int(time.time() * 1000)
            )
            conflicts.append(conflict)

        return conflicts


conflict_detector = ConflictDetector()
