"""
MineIntel Phase 3: Structured Evidence-Aware Prompt Builder

Grounds local AI models (qwen2.5:7b and qwen2.5vl:7b) directly in Phase 2 structured evidence:
- Gathers and classifies evidence items into LOCKED FACTS, CALCULATED VALUES, and SUMMARIZABLE TEXT
- Enforces strict source citation mandates (requiring evidence ID and provenance citations)
- Prohibits extrapolation, numeric alteration, and hallucination
- Links parent evidence IDs for immutable lineage tracking
"""
import logging
from typing import Any, Dict, List, Optional, Tuple

from backend.services import evidence_store
from backend.services.evidence_models import EvidenceClassification

logger = logging.getLogger("mineintel.evidence_prompts")


class EvidencePromptBuilder:
    """Constructs verifiable, evidence-grounded system instructions and prompts."""

    SYSTEM_REASONING_INSTRUCTION = (
        "You are MineIntel Sovereign Intelligence Auditor for the Ministry of Coal, Government of India. "
        "Your duty is to perform rigorous, objective document reasoning grounded strictly in the provided evidence. "
        "\n\nSTRICT GOVERNANCE RULES:\n"
        "1. GROUNDING MANDATE: Rely exclusively on the LOCKED FACTS and CALCULATED VALUES supplied below. "
        "Do NOT invent, extrapolate, or estimate figures not explicitly present.\n"
        "2. CITATION MANDATE: Every quantitative finding, variance, or deduction must cite its specific evidence ID "
        "and provenance reference (e.g. `[EVD-FACT-1234: Lakhanpur | Page 1]`).\n"
        "3. TRUTHFUL REASONING: Clearly separate source facts from analytical deductions. "
        "If data is missing, explicitly declare the telemetry gap rather than assuming metrics."
    )

    SYSTEM_VL_INSTRUCTION = (
        "You are MineIntel Visual Evidence Inspector for the Ministry of Coal. "
        "Analyze the supplied visual evidence asset with technical precision. "
        "Report physical infrastructure status, machinery condition, environmental compliance, and safety markings. "
        "Provide a concise executive caption and cite the visual asset specification."
    )

    @classmethod
    def build_reasoning_prompt(
        cls,
        job_id: Optional[str] = None,
        evidence_items: Optional[List[Dict[str, Any]]] = None,
        custom_instruction: Optional[str] = None,
        owner_id: Optional[str] = None,
        limit_items: int = 100
    ) -> Tuple[str, str, List[str]]:
        """
        Builds an evidence-grounded prompt for qwen2.5:7b.
        Returns: (prompt_text, system_instruction, parent_evidence_ids)
        """
        items: List[Dict[str, Any]] = []
        if evidence_items:
            items = evidence_items
        elif job_id:
            res = evidence_store.query_evidence(job_id=job_id, owner_id=owner_id, limit=limit_items)
            items = res.get("items", [])

        locked_facts: List[Dict[str, Any]] = []
        calculated_values: List[Dict[str, Any]] = []
        narratives: List[Dict[str, Any]] = []
        parent_ids: List[str] = []

        for it in items:
            ev_id = it.get("evidence_id", "")
            parent_ids.append(ev_id)
            classification = it.get("classification", "")
            if classification == EvidenceClassification.LOCKED_FACT.value:
                locked_facts.append(it)
            elif classification == EvidenceClassification.CALCULATED_VALUE.value:
                calculated_values.append(it)
            else:
                narratives.append(it)

        sections: List[str] = [
            "# INGESTED EVIDENCE DOSSIER FOR AUDIT REASONING",
            "### STRICT GROUNDING RULES:",
            "1. Ground all findings strictly in LOCKED FACTS and CALCULATED VALUES.",
            "2. Cite evidence IDs [EV-xxxx] for all numbers.",
            "3. Prohibit hallucination and ungrounded estimations.",
            f"- **Total Evidence Items Supplied:** {len(items)}",
            f"- **Locked Facts:** {len(locked_facts)} | **Calculated Values:** {len(calculated_values)} | **Narrative Texts:** {len(narratives)}",
            "\n---\n"
        ]

        if locked_facts:
            sections.append("## 1. LOCKED SOURCE FACTS (Source-Faithful, Non-Negotiable)")
            for fact in locked_facts[:50]:
                ev_id = fact.get("evidence_id")
                prov = (fact.get("provenance") or {}).get("filename") or (fact.get("provenance") or {}).get("provenance") or "Source"
                txt = fact.get("content_text") or fact.get("content") or ""
                sections.append(f"- `[{ev_id} | {prov}]`: {txt}")
            sections.append("\n")

        if calculated_values:
            sections.append("## 2. DETERMINISTIC CALCULATED VALUES (Audit-Verified Computations)")
            for calc in calculated_values[:30]:
                ev_id = calc.get("evidence_id")
                prov = (calc.get("provenance") or {}).get("sheet_name") or (calc.get("provenance") or {}).get("filename") or (calc.get("provenance") or {}).get("provenance") or "Calculation"
                txt = calc.get("content_text") or calc.get("content") or ""
                sections.append(f"- `[{ev_id} | {prov}]`: {txt}")
            sections.append("\n")

        if narratives:
            sections.append("## 3. SOURCE TEXT NARRATIVES & OBSERVATIONS")
            for narr in narratives[:30]:
                ev_id = narr.get("evidence_id")
                prov = (narr.get("provenance") or {}).get("filename") or (narr.get("provenance") or {}).get("provenance") or "Document"
                txt = narr.get("content_text") or narr.get("content") or ""
                sections.append(f"- `[{ev_id} | {prov}]`: {txt}")
            sections.append("\n")

        if custom_instruction and custom_instruction.strip():
            sections.append("## 4. EXECUTIVE AUDITOR FOCUS & DIRECTIVES")
            sections.append(custom_instruction.strip())
            sections.append("\n")

        sections.append(
            "## 5. REQUIRED SYNTHESIS OUTPUT FORMAT\n"
            "Provide:\n"
            "1. **Executive Operational Summary**: High-level synthesis grounded in locked facts.\n"
            "2. **Critical Telemetry Findings & Variances**: Discrepancies, targets vs actuals, and anomalies cited with evidence IDs.\n"
            "3. **Statutory & Environmental Compliance Assessment**: Direct observations from narratives.\n"
            "4. **Verified Mathematical Audit**: Reference the calculated values and verify balance.\n"
            "5. **Data Gaps & Missing Telemetry**: Note any areas where evidence was incomplete."
        )

        prompt_text = "\n".join(sections)
        return prompt_text, cls.SYSTEM_REASONING_INSTRUCTION, parent_ids

    @classmethod
    def build_multimodal_caption_prompt(
        cls,
        image_evidence: Dict[str, Any],
        custom_instruction: Optional[str] = None
    ) -> Tuple[str, str, List[str]]:
        """
        Builds visual evidence inspection prompt for qwen2.5vl:7b.
        Returns: (prompt_text, system_instruction, parent_evidence_ids)
        """
        ev_id = image_evidence.get("evidence_id", "IMAGE-ASSET")
        meta = image_evidence.get("metadata", {})
        prov = (image_evidence.get("provenance") or {}).get("provenance", "Image Asset")
        w = meta.get("width") or (image_evidence.get("content_json") or {}).get("width", "Unknown")
        h = meta.get("height") or (image_evidence.get("content_json") or {}).get("height", "Unknown")
        fmt = meta.get("format") or (image_evidence.get("content_json") or {}).get("format", "Image")

        prompt_text = (
            f"Official Visual Evidence Asset Citation: `[{ev_id} | {prov}]`\n"
            f"Asset Specifications: {w}x{h} px, Format: {fmt}.\n\n"
            "Please examine this image and provide:\n"
            "1. **Executive Title & Subject**: Concise technical heading identifying what is depicted.\n"
            "2. **Visual Inspection Observations**: Key equipment, terrain, infrastructure, or condition observed.\n"
            "3. **Publication Caption**: A formal 1-2 sentence caption suitable for a Ministry audit dossier.\n"
        )
        if custom_instruction and custom_instruction.strip():
            prompt_text += f"\nSpecific Inspection Directive: {custom_instruction.strip()}\n"

        return prompt_text, cls.SYSTEM_VL_INSTRUCTION, [ev_id]


prompt_builder = EvidencePromptBuilder()
build_evidence_grounded_prompt = EvidencePromptBuilder.build_reasoning_prompt
build_multimodal_caption_prompt = EvidencePromptBuilder.build_multimodal_caption_prompt
