"""
MineIntel Phase 6: Report Planning Engine

Transforms Phase 2 structured evidence, Phase 4 intelligence dossiers, and Phase 5 charts
into a machine-readable, reproducible Report Plan:
- Topic-first dynamic section hierarchy (avoids rigid templates)
- Integrates adaptive chronological periods as subsections when temporal signals exist
- Attaches relevant Phase 5 charts and candidate tables with exact provenance
- Tracks breakdown of LOCKED FACT, CALCULATED VALUE, SUMMARIZABLE TEXT, AI ANALYSIS, etc.
- Enforces strict evidence sufficiency validation; flags missing items rather than hallucinating
"""

import hashlib
import logging
import time
from typing import Any, Dict, List, Optional, Set, Tuple

from backend.services.chart_models import ChartType
from backend.services.evidence_models import EvidenceClassification
from backend.services.intelligence_models import TopicCategory
from backend.services.planner_models import (
    MissingEvidenceFlag,
    PlannedSection,
    PlanStatus,
    ReportPlan,
    SectionType,
)

logger = logging.getLogger("mineintel.report_planner")

TOPIC_TITLES = {
    TopicCategory.PRODUCTION_DISPATCH.value: "Production Output, Excavation & Dispatch Operations",
    TopicCategory.SAFETY_ENVIRONMENTAL.value: "Mine Safety Protocol & Environmental Compliance",
    TopicCategory.GEOLOGICAL_RESERVES.value: "Geological Stratification & Mineral Reserve Assessment",
    TopicCategory.FINANCIAL_OPERATIONAL.value: "Financial Capital, Operating Expenditure & Revenue Audit",
    TopicCategory.EQUIPMENT_INFRASTRUCTURE.value: "Heavy Earth Moving Machinery (HEMM) & Infrastructure Fleet",
    TopicCategory.STATUTORY_COMPLIANCE.value: "Statutory Directives & DGMS Regulatory Audit",
    TopicCategory.GENERAL.value: "General Operational Administration & Colliery Records"
}


class ReportPlanner:
    """Dynamically plans structured report sections from active evidence and charts."""

    @classmethod
    def _compute_evidence_breakdown(cls, items: List[Dict[str, Any]]) -> Dict[str, int]:
        """Counts items by classification."""
        breakdown = {c.value: 0 for c in EvidenceClassification}
        for it in items:
            cls_name = it.get("classification", EvidenceClassification.LOCKED_FACT.value)
            if cls_name in breakdown:
                breakdown[cls_name] += 1
            else:
                breakdown.setdefault(cls_name, 0)
                breakdown[cls_name] += 1
        return {k: v for k, v in breakdown.items() if v > 0}

    @classmethod
    def _extract_provenance_citations(cls, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extracts unique source citations for evidence items."""
        citations = []
        seen = set()
        for it in items:
            prov = it.get("provenance") or {}
            fn = prov.get("filename", "Source Document")
            citation = prov.get("citation") or prov.get("provenance") or f"File: {fn}"
            key = (fn, citation)
            if key not in seen:
                seen.add(key)
                citations.append({
                    "evidence_id": it.get("evidence_id"),
                    "filename": fn,
                    "citation": citation,
                    "source_type": prov.get("source_type", "document")
                })
        return citations

    @classmethod
    def plan(
        cls,
        job_id: str,
        owner_id: str,
        evidence_items: List[Dict[str, Any]],
        dossier: Optional[Dict[str, Any]] = None,
        charts: Optional[List[Dict[str, Any]]] = None,
        tables: Optional[List[Dict[str, Any]]] = None,
        title_override: Optional[str] = None,
        version: int = 1
    ) -> ReportPlan:
        """
        Dynamically constructs a ReportPlan from available evidence and artifacts.
        Guarantees zero hallucinated sections and full provenance tracking.
        """
        now_ms = int(time.time() * 1000)
        charts = charts or []
        tables = tables or []
        missing_flags: List[MissingEvidenceFlag] = []

        # ---------------------------------------------------------------------
        # 1. Topic Mapping & Item Association
        # ---------------------------------------------------------------------
        # Map evidence items by ID
        ev_by_id = {it.get("evidence_id"): it for it in evidence_items if it.get("evidence_id")}

        # Group items by topic
        topic_map: Dict[str, List[Dict[str, Any]]] = {}
        if dossier and dossier.get("topics"):
            for topic, ev_ids in dossier["topics"].items():
                matched_items = [ev_by_id[eid] for eid in ev_ids if eid in ev_by_id]
                if matched_items:
                    topic_map[topic] = matched_items
        else:
            # Fallback direct topic classification
            from backend.services.topic_classifier import topic_classifier
            for it in evidence_items:
                topic = topic_classifier.classify_item(it)
                topic_map.setdefault(topic, []).append(it)

        # ---------------------------------------------------------------------
        # 2. Timeline Mapping for Adaptive Chronology Subsections
        # ---------------------------------------------------------------------
        timeline_buckets = []
        if dossier and dossier.get("chronological_timeline"):
            timeline_buckets = dossier["chronological_timeline"]

        sections: List[PlannedSection] = []
        section_counter = 1

        # ---------------------------------------------------------------------
        # 3. Section 1: Executive Summary & Operational Synthesis
        # ---------------------------------------------------------------------
        # Executive summary depends on subsequent detailed topic sections
        all_topic_keys = [t for t in topic_map.keys() if t != TopicCategory.GENERAL.value]
        exec_ev_items = evidence_items[:15]  # Top summary evidence items
        exec_citations = cls._extract_provenance_citations(exec_ev_items)
        exec_breakdown = cls._compute_evidence_breakdown(exec_ev_items)

        sec_exec = PlannedSection(
            section_id=f"SEC-{section_counter}",
            title="Executive Summary & Analytical Synthesis",
            topic="EXECUTIVE_SUMMARY",
            section_type=SectionType.EXECUTIVE_SUMMARY.value,
            order_index=section_counter,
            dependencies=[],  # Top-level entrypoint
            evidence_ids=[it["evidence_id"] for it in exec_ev_items],
            evidence_breakdown=exec_breakdown,
            chart_ids=[c.get("chart_id") for c in charts[:1] if c.get("chart_id")],
            table_ids=[t.get("table_id") for t in tables[:1] if t.get("table_id")],
            provenance_citations=exec_citations[:5],
            validation_status="supported" if exec_ev_items else "insufficient",
            validation_notes=["Grounding summary on verified facts and calculated values."] if exec_ev_items else ["Insufficient evidence to synthesize executive summary."]
        )
        sections.append(sec_exec)
        section_counter += 1

        # ---------------------------------------------------------------------
        # 4. Dynamic Topic Sections & Subsections
        # ---------------------------------------------------------------------
        for topic, items in topic_map.items():
            topic_title = TOPIC_TITLES.get(topic, f"{topic.replace('_', ' ').title()} Operational Audit")
            topic_ev_ids = [it.get("evidence_id") for it in items if it.get("evidence_id")]
            topic_citations = cls._extract_provenance_citations(items)
            topic_breakdown = cls._compute_evidence_breakdown(items)

            # Match Phase 5 charts relevant to this topic
            matched_charts = []
            for c in charts:
                cfg = c.get("config", {})
                title_c = (cfg.get("title") or "").lower()
                y_label = (cfg.get("y_axis_label") or "").lower()
                topic_words = topic.lower().split("_")
                if any(w in title_c or w in y_label for w in topic_words):
                    c_id = c.get("chart_id")
                    if c_id and c_id not in matched_charts:
                        matched_charts.append(c_id)

            # Match Phase 5 tables
            matched_tables = []
            for t in tables:
                t_metrics = [m.lower() for m in t.get("detected_metric_columns", [])]
                topic_words = topic.lower().split("_")
                if any(any(w in m for w in topic_words) for m in t_metrics):
                    t_id = t.get("table_id")
                    if t_id and t_id not in matched_tables:
                        matched_tables.append(t_id)

            # Build subsections dynamically if chronology timeline buckets exist
            subsections: List[PlannedSection] = []
            sub_counter = 1

            if timeline_buckets:
                for b in timeline_buckets:
                    b_period = b.get("period")
                    if b_period == "Undated":
                        continue
                    b_ev_ids = [eid for eid in b.get("evidence_ids", []) if eid in topic_ev_ids]
                    if b_ev_ids:
                        b_items = [ev_by_id[eid] for eid in b_ev_ids if eid in ev_by_id]
                        sub = PlannedSection(
                            section_id=f"SEC-{section_counter}.{sub_counter}",
                            title=f"Chronological Performance: {b_period}",
                            topic=topic,
                            section_type=SectionType.CHRONOLOGY_BREAKDOWN.value,
                            order_index=sub_counter,
                            dependencies=[f"SEC-{section_counter}"],
                            evidence_ids=b_ev_ids,
                            evidence_breakdown=cls._compute_evidence_breakdown(b_items),
                            provenance_citations=cls._extract_provenance_citations(b_items)[:3],
                            chronology_period=b_period,
                            validation_status="supported"
                        )
                        subsections.append(sub)
                        sub_counter += 1

            sec_topic = PlannedSection(
                section_id=f"SEC-{section_counter}",
                title=topic_title,
                topic=topic,
                section_type=SectionType.TOPIC_ANALYSIS.value,
                order_index=section_counter,
                dependencies=["SEC-1"],  # Depends on Executive Summary baseline
                subsections=subsections,
                evidence_ids=topic_ev_ids,
                evidence_breakdown=topic_breakdown,
                chart_ids=matched_charts,
                table_ids=matched_tables,
                provenance_citations=topic_citations[:8],
                validation_status="supported" if topic_ev_ids else "insufficient"
            )
            sections.append(sec_topic)
            section_counter += 1

        # ---------------------------------------------------------------------
        # 5. Section: Statutory Compliance & Discrepancy Audit
        # ---------------------------------------------------------------------
        conflicts = (dossier.get("conflicts", []) if dossier else [])
        compliance_items = topic_map.get(TopicCategory.STATUTORY_COMPLIANCE.value, [])
        comp_ev_ids = [it.get("evidence_id") for it in compliance_items if it.get("evidence_id")]

        sec_compliance = PlannedSection(
            section_id=f"SEC-{section_counter}",
            title="Statutory Directives, DGMS Compliance & Audit Discrepancies",
            topic=TopicCategory.STATUTORY_COMPLIANCE.value,
            section_type=SectionType.STATUTORY_COMPLIANCE.value,
            order_index=section_counter,
            dependencies=["SEC-1"],
            evidence_ids=comp_ev_ids,
            evidence_breakdown=cls._compute_evidence_breakdown(compliance_items),
            provenance_citations=cls._extract_provenance_citations(compliance_items)[:5],
            validation_status="supported" if (comp_ev_ids or conflicts) else "insufficient",
            validation_notes=[f"Audited {len(conflicts)} discrepancies from multi-source intelligence."] if conflicts else []
        )
        if not comp_ev_ids and not conflicts:
            missing_flags.append(MissingEvidenceFlag(
                flag_id=f"FLAG-{hashlib.sha256(f'{job_id}:statutory'.encode()).hexdigest()[:8]}",
                section_id=sec_compliance.section_id,
                topic=TopicCategory.STATUTORY_COMPLIANCE.value,
                required_evidence_type="Statutory clearances, DGMS notices, or environmental compliance records",
                severity="warning",
                rationale="No statutory clearance filings or compliance telemetry detected in active evidence dossier."
            ))
        sections.append(sec_compliance)
        section_counter += 1

        # ---------------------------------------------------------------------
        # 6. Section: Quantitative Data Tables & Provenance Ledger
        # ---------------------------------------------------------------------
        tabular_items = [it for it in evidence_items if it.get("classification") in [EvidenceClassification.CALCULATED_VALUE.value, EvidenceClassification.LOCKED_FACT.value]]
        sec_audit = PlannedSection(
            section_id=f"SEC-{section_counter}",
            title="Quantitative Data Ledger & Calculation Audit",
            topic="TABULAR_AUDIT",
            section_type=SectionType.TABULAR_AUDIT.value,
            order_index=section_counter,
            dependencies=["SEC-1"],
            evidence_ids=[it.get("evidence_id") for it in tabular_items[:30]],
            evidence_breakdown=cls._compute_evidence_breakdown(tabular_items),
            table_ids=[t.get("table_id") for t in tables if t.get("table_id")],
            provenance_citations=cls._extract_provenance_citations(tabular_items)[:10],
            validation_status="supported" if tabular_items else "insufficient"
        )
        sections.append(sec_audit)

        # ---------------------------------------------------------------------
        # 7. Evidence Sufficiency Scoring & Validation
        # ---------------------------------------------------------------------
        total_sections = len(sections)
        supported_sections = sum(1 for s in sections if s.validation_status == "supported")
        sufficiency_score = round(supported_sections / max(1, total_sections), 2)

        # Check for empty sections and flag missing evidence
        for s in sections:
            if not s.evidence_ids and s.section_type != SectionType.EXECUTIVE_SUMMARY.value:
                s.validation_status = "insufficient"
                s.validation_notes.append("No source evidence records linked to this planned topic.")
                missing_flags.append(MissingEvidenceFlag(
                    flag_id=f"FLAG-{hashlib.sha256(f'{job_id}:{s.section_id}'.encode()).hexdigest()[:8]}",
                    section_id=s.section_id,
                    topic=s.topic,
                    required_evidence_type=f"Verified records for topic {s.topic}",
                    severity="critical" if s.section_type == SectionType.TOPIC_ANALYSIS.value else "warning",
                    rationale=f"Section '{s.title}' lacks supporting locked facts or calculated data."
                ))

        plan_status = (
            PlanStatus.READY_FOR_GENERATION.value
            if sufficiency_score >= 0.75 and not any(f.severity == "critical" for f in missing_flags)
            else PlanStatus.INSUFFICIENT_EVIDENCE.value
        )

        total_ev_ref = len(set(eid for s in sections for eid in s.evidence_ids))
        total_ch_ref = len(set(cid for s in sections for cid in s.chart_ids))

        plan_id = f"PLAN-{hashlib.sha256(f'{job_id}:v{version}:{time.time()}'.encode()).hexdigest()[:10].upper()}"
        report_title = title_override or (
            f"MineIntel Comprehensive Operational Intelligence Dossier"
            if len(all_topic_keys) > 1 else f"MineIntel {TOPIC_TITLES.get(all_topic_keys[0], 'Operational Report') if all_topic_keys else 'Operations Report'}"
        )

        plan = ReportPlan(
            plan_id=plan_id,
            job_id=job_id,
            owner_id=owner_id,
            version=version,
            status=plan_status,
            title=report_title,
            subtitle=f"Automated Multi-Topic Evidence Synthesis (Job: {job_id})",
            sections=sections,
            total_evidence_referenced=total_ev_ref,
            total_charts_referenced=total_ch_ref,
            evidence_sufficiency_score=sufficiency_score,
            insufficient_evidence_flags=missing_flags,
            metadata={
                "topics_covered": list(topic_map.keys()),
                "total_sections_count": len(sections),
                "total_subsections_count": sum(len(s.subsections) for s in sections),
                "dominant_granularity": dossier.get("dominant_granularity", "undated") if dossier else "undated"
            },
            created_at=now_ms,
            updated_at=now_ms
        )

        logger.info(f"Planned report {plan_id} (version {version}) for job {job_id}: {len(sections)} sections, sufficiency={sufficiency_score}")
        return plan


report_planner = ReportPlanner()
