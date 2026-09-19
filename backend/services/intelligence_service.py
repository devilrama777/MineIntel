"""
MineIntel Phase 4: Intelligence Service Orchestrator
Coordinates topic classification, adaptive chronology, duplicate clustering,
and conflict detection over Phase 2 structured evidence.
"""

from typing import List, Dict, Any, Optional
import logging
import time
from backend.services import evidence_store
from backend.services.intelligence_models import (
    OrganizedEvidenceDossier,
    EvidenceConflict,
    DuplicateCluster
)
from backend.services import intelligence_store
from backend.services.topic_classifier import topic_classifier
from backend.services.chronology_engine import chronology_engine
from backend.services.duplicate_detector import duplicate_detector
from backend.services.conflict_detector import conflict_detector

logger = logging.getLogger("mineintel.intelligence")


class IntelligenceService:
    def organize_job_evidence(self, job_id: str, owner_id: str) -> Dict[str, Any]:
        """
        Runs the complete Phase 4 intelligence analysis over a job's structured evidence.
        Preserves 100% of raw evidence without deletion.
        """
        query_res = evidence_store.query_evidence(job_id=job_id, owner_id=owner_id, limit=1000)
        evidence_items = query_res.get("items", []) if isinstance(query_res, dict) else query_res
        now_ms = int(time.time() * 1000)

        if not evidence_items:
            empty_dossier = OrganizedEvidenceDossier(
                job_id=job_id,
                owner_id=owner_id,
                total_source_items=0,
                deduplicated_items_count=0,
                duplicate_clusters=[],
                topics={},
                chronological_timeline=[],
                conflicts=[],
                deduplicated_evidence_items=[],
                created_at=now_ms
            )
            dossier_dict = empty_dossier.to_dict()
            intelligence_store.save_dossier(dossier_dict)
            return dossier_dict

        # 1. Topic classification
        topics_map = topic_classifier.organize_by_topic(evidence_items)

        # 2. Adaptive Chronology
        timeline = chronology_engine.build_adaptive_timeline(evidence_items)

        # 3. Duplicate Detection & Authoritative Selection (no deletions)
        duplicate_clusters, deduplicated_items = duplicate_detector.find_duplicate_clusters(evidence_items)
        cluster_dicts = [c.to_dict() for c in duplicate_clusters]

        # 4. Conflict & Discrepancy Detection with Source Priority Matrix
        conflicts = conflict_detector.detect_conflicts(evidence_items, job_id=job_id, owner_id=owner_id)
        conflict_dicts = [c.to_dict() for c in conflicts]

        # 5. Assemble Dossier
        dossier = OrganizedEvidenceDossier(
            job_id=job_id,
            owner_id=owner_id,
            total_source_items=len(evidence_items),
            deduplicated_items_count=len(deduplicated_items),
            duplicate_clusters=cluster_dicts,
            topics=topics_map,
            chronological_timeline=timeline,
            conflicts=conflict_dicts,
            deduplicated_evidence_items=deduplicated_items,
            created_at=now_ms
        )

        dossier_dict = dossier.to_dict()
        intelligence_store.save_dossier(dossier_dict)
        logger.info(f"Organized dossier for job {job_id} ({len(evidence_items)} items, {len(conflicts)} conflicts)")
        return dossier_dict

    def get_dossier(self, job_id: str, owner_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves organized dossier with ownership check."""
        return intelligence_store.get_dossier(job_id, owner_id=owner_id)

    def get_conflicts(self, job_id: str, owner_id: str) -> List[Dict[str, Any]]:
        """Retrieves conflicts for a job."""
        return intelligence_store.list_conflicts(job_id, owner_id=owner_id)

    def get_timeline(self, job_id: str, owner_id: str) -> List[Dict[str, Any]]:
        """Retrieves chronology timeline for a job."""
        dossier = self.get_dossier(job_id, owner_id=owner_id)
        if dossier:
            return dossier.get("chronological_timeline", [])
        return []

    def resolve_conflict(
        self,
        conflict_id: str,
        status: str,
        owner_id: str,
        resolution_notes: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Resolves an identified conflict and updates the persistence store."""
        return intelligence_store.update_conflict_status(
            conflict_id=conflict_id,
            status=status,
            resolution_notes=resolution_notes,
            owner_id=owner_id
        )


intelligence_service = IntelligenceService()
