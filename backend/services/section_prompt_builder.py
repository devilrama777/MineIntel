"""
MineIntel Section Prompt Builder
Constructs standardized, evidence-grounded prompts for section synthesis.
Enforces strict markdown tabular formatting and eliminates binary hallucinations.
"""
from typing import Any, Dict, List, Optional


def build_section_prompt(
    plan_title: str = "",
    section_title: str = "",
    section_topic: str = "",
    raw_evidence: Optional[str] = None,
    chunk_summaries: Optional[List[str]] = None,
    evidence_items: Optional[List[Dict[str, Any]]] = None,
    bounded_text: Optional[str] = None,
    **kwargs
) -> str:
    """
    Builds the standardized prompt for an individual report section.
    Enforces strict tabular markdown formatting and zero hallucinations.
    """
    chunk_summaries_block = ""
    if chunk_summaries:
        chunk_summaries_block = (
            "Verified Chunk Summaries (from database evidence batches):\n"
            + "\n".join([f"- {s.strip()}" for s in chunk_summaries if s.strip()])
            + "\n\n"
        )

    evidence_items_block = ""
    if bounded_text:
        evidence_items_block = f"Direct Source Evidence Records:\n{bounded_text}\n\n"
    elif evidence_items:
        evidence_items_block = "Direct Source Evidence Records:\n" + "\n".join([
            f"- [Evidence {it.get('evidence_id')} | {it.get('provenance', {}).get('filename', 'Source')}]: {(it.get('content_text') or '')[:400]}"
            for it in evidence_items[:5]
        ]) + "\n\n"

    raw_digest = ""
    if raw_evidence:
        clean_raw = raw_evidence[:8000]
        raw_digest = (
            f"\n### SOURCE DOCUMENT CONTENT (GROUND TRUTH)\n"
            f"{clean_raw}\n\n"
            f"### DATA EXTRACTION DIRECTIVES\n"
            f"- Extract EVERY numeric row from tables (do not skip months).\n"
            f"- If the same metric appears across multiple sources with different "
            f"values, LIST BOTH and mark as 'SOURCE CONFLICT' with both source refs.\n"
            f"- Aggregate totals by sum where appropriate.\n"
            f"- Preserve month-by-month granularity when data is monthly.\n\n"
        )

    prompt = (
        f"You are a Senior Executive Consultant writing an official CIL/CMPDI report.\n\n"
        f"REPORT CONTEXT: {plan_title}\n"
        f"SECTION: {section_title}\n"
        f"FOCUS: {section_topic or section_title}\n"
        f"{raw_digest}"
        f"{chunk_summaries_block}"
        f"{evidence_items_block}"
        f"\n### STRICT WRITING RULES\n"
        f"1. YOU ARE WRITING A NARRATIVE REPORT, NOT A DATA DUMP. Do NOT output raw tags like `[LOCKED FACT]`, `[CALCULATED VALUE]`, or `[EVD-...]`. \n"
        f"2. Synthesize the data into full, professional sentences. For example:\n"
        f"   - BAD: \"[LOCKED FACT] month=Jan-2025, rom_production_t=188000\"\n"
        f"   - GOOD: \"In January 2025, ROM production reached 188,000 tonnes.\"\n"
        f"3. Every number MUST be traceable to the source evidence, but cite it naturally, e.g., \"ROM production reached 188,000 tonnes (Source: OPS-NBC-H1-2025-001).\"\n"
        f"4. If you see the text `[CHART VISUALIZATION PLACEHOLDER]`, IGNORE IT COMPLETELY. Do not mention it, do not output it. Just continue writing the surrounding text.\n"
        f"5. If two source documents give different values for the same metric, write a polite, professional note: \"Data note: Source A reports X, while Source B reports Y. This discrepancy requires reconciliation.\"\n"
        f"6. Do NOT include placeholder text like \"[insert here]\" or ellipsis.\n"
        f"7. Output ONLY valid Markdown. Use tables only when presenting multi-row data, and format them perfectly.\n"
    )
    return prompt
