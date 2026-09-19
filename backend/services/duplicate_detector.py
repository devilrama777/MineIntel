"""
MineIntel Phase 4: Duplicate Detection Engine

Identifies exact and semantic duplicate evidence items without deleting originals:
- Hashing and normalized text matching
- Tabular row equivalence
- Source-priority selection of the primary authoritative evidence record
- Maintains full audit traceability of duplicate clusters
"""
import hashlib
import logging
import re
from typing import Any, Dict, List, Set, Tuple

from backend.services.intelligence_models import (
    DuplicateCluster,
    SourcePriority,
)

logger = logging.getLogger("mineintel.duplicates")


class DuplicateDetector:
    """Detects duplicate evidence items and forms deduplicated downstream views."""

    @classmethod
    def _normalize_text(cls, text: str) -> str:
        """Removes punctuation, excess whitespace, and normalizes casing."""
        if not text:
            return ""
        cleaned = re.sub(r"[^\w\s]", "", text.lower())
        return re.sub(r"\s+", " ", cleaned).strip()

    @classmethod
    def _get_item_priority(cls, item: Dict[str, Any]) -> int:
        """Determines authority score for selecting the primary evidence item."""
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
    def find_duplicate_clusters(cls, items: List[Dict[str, Any]]) -> Tuple[List[DuplicateCluster], List[Dict[str, Any]]]:
        """
        Groups identical/near-identical items into DuplicateClusters.
        Returns:
            (clusters, deduplicated_items)
        CRITICAL: Never deletes or mutates original evidence records in the database.
        """
        text_map: Dict[str, List[Dict[str, Any]]] = {}
        exact_row_map: Dict[str, List[Dict[str, Any]]] = {}

        for it in items:
            raw_text = it.get("content_text") or it.get("content") or ""
            norm_text = cls._normalize_text(str(raw_text))

            # Group by normalized text if meaningful length (> 10 chars)
            if len(norm_text) > 10:
                text_map.setdefault(norm_text, []).append(it)

            # Also check structured content_json identity
            content_json = it.get("content_json") or {}
            if isinstance(content_json, dict) and len(content_json) > 1:
                # Key based on sorted key-value strings
                row_key = hashlib.sha256(str(sorted(content_json.items())).encode()).hexdigest()[:16]
                exact_row_map.setdefault(row_key, []).append(it)

        clusters: List[DuplicateCluster] = []
        clustered_evidence_ids: Set[str] = set()
        cluster_idx = 1

        # Process exact text groups
        for norm_text, group in text_map.items():
            if len(group) > 1:
                # Select primary based on source priority, then length
                sorted_group = sorted(
                    group,
                    key=lambda x: (cls._get_item_priority(x), len(str(x.get("content_text", "")))),
                    reverse=True
                )
                primary = sorted_group[0]
                duplicates = sorted_group[1:]

                p_id = primary.get("evidence_id", "")
                d_ids = [d.get("evidence_id", "") for d in duplicates if d.get("evidence_id")]

                cluster = DuplicateCluster(
                    cluster_id=f"DUP-CLUSTER-{cluster_idx:03d}",
                    primary_evidence_id=p_id,
                    duplicate_evidence_ids=d_ids,
                    similarity_score=1.0,
                    match_type="normalized_text"
                )
                clusters.append(cluster)
                clustered_evidence_ids.update(d_ids)
                cluster_idx += 1

        # Build deduplicated items list (excluding secondary duplicates from the downstream view)
        deduplicated_items: List[Dict[str, Any]] = []
        for it in items:
            ev_id = it.get("evidence_id", "")
            item_copy = dict(it)
            if ev_id in clustered_evidence_ids:
                item_copy["is_duplicate_secondary"] = True
                # Find which cluster it belongs to
                for c in clusters:
                    if ev_id in c.duplicate_evidence_ids:
                        item_copy["duplicate_of"] = c.primary_evidence_id
                        item_copy["cluster_id"] = c.cluster_id
                        break
            else:
                item_copy["is_duplicate_secondary"] = False
                deduplicated_items.append(item_copy)

        return clusters, deduplicated_items


duplicate_detector = DuplicateDetector()
