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
        f"1. Use ONLY facts present in the source content above. NEVER invent numbers.\n"
        f"2. When you cite a number, mark it as [Source: <document name>].\n"
        f"3. If two sources disagree, write: 'Conflict: Source A reports X, Source B reports Y. Data-quality note: requires reconciliation.'\n"
        f"4. Do NOT echo raw binary data. If source content is unreadable, say 'Source content unavailable in parseable form'.\n"
        f"5. Do NOT mention AI, Ollama, Groq, LLM, or internal engine names.\n"
        f"6. TABULAR DATA: You MUST format any multi-row data as a proper Markdown table. Do NOT output raw comma-separated strings or concatenated text.\n"
        f"7. TABLE EXAMPLE: Use this exact format:\n| Header 1 | Header 2 |\n|----------|----------|\n| Value A  | Value B  |\n"
        f"8. If the source evidence provides a table, reconstruct it perfectly in Markdown.\n"
        f"9. Aim for 200-450 words per section.\n"
    )
    return prompt
