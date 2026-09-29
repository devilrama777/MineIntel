import json
import logging
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend import config
from backend.services.converter import MarkdownConverter
from backend.services.ai_inference_service import ai_inference_service
from backend.services.ai_providers.base import AIRequest
from backend.services.math_engine import MathEngine

logger = logging.getLogger("mineintel.pipeline")


class AIReasoningClient:
    """Sovereign local AI reasoning and synthesis client powered by Qwen 2.5."""

    def __init__(self, *args, **kwargs):
        self.model = getattr(config, "LOCAL_MODEL_QWEN25", "qwen2.5:7b")

    def analyze_document(self, markdown_content: str = "", custom_command: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        provider = ai_inference_service._get_provider()
        prompt = (
            f"Perform a comprehensive executive analysis of this operational document. "
            f"Extract key figures, metrics, and trends:\n\n{markdown_content[:6000]}"
        )
        if custom_command:
            prompt = f"{custom_command}\n\n{prompt}"

        req = AIRequest(
            prompt=prompt,
            system_instruction="You are an Executive Intelligence Analyst. Deliver factual, quantitative operational insights based strictly on the document text.",
            model=self.model,
            temperature=0.1
        )
        resp = provider.generate(req)
        if not resp.success or not resp.text:
            raise RuntimeError(resp.error or "Local AI document analysis failed. No fallback allowed.")
        return {"analysis": resp.text, "model_used": resp.model}

    def generate_systematic_report(
        self,
        analysis: str = "",
        math_audit_markdown: str = "",
        custom_instructions: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        provider = ai_inference_service._get_provider()
        prompt = (
            f"Synthesize an official Board-Level Executive Operational Report based on this validated analysis and audited figures:\n\n"
            f"### Document Analysis\n{analysis}\n\n"
            f"### Verified Mathematical Audit\n{math_audit_markdown}\n\n"
            f"Format as clean, board-ready Markdown with Executive Summary, Operational Findings, and Strategic Directives."
        )
        if custom_instructions:
            prompt = f"Focus Directive: {custom_instructions}\n\n{prompt}"

        req = AIRequest(
            prompt=prompt,
            system_instruction="You are a Senior Executive Consultant delivering a publication-grade corporate dossier for the Board of Directors.",
            model=self.model,
            temperature=0.1
        )
        resp = provider.generate(req)
        if not resp.success or not resp.text:
            raise RuntimeError(resp.error or "Local AI systematic report synthesis failed. No fallback allowed.")
        return {"final_report": resp.text, "model_used": resp.model}


class DocumentPipeline:
    """Orchestrates document conversion, reasoning, math audit, and report generation."""

    def __init__(self):
        self.converter = MarkdownConverter()
        self.math_engine = MathEngine()
        self.ai_client = AIReasoningClient()

    def process_file(
        self,
        file_path: Path,
        custom_analysis_cmd: Optional[str] = None,
        custom_calculations: Optional[List[Dict[str, Any]]] = None,
        custom_report_cmd: Optional[str] = None,
        model_override: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Runs the entire multi-stage pipeline sequentially and saves artifacts with strict job isolation."""
        job_id = f"job_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        job_dir = config.OUTPUTS_DIR / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        media_dir = job_dir / "extracted_media"
        media_dir.mkdir(parents=True, exist_ok=True)

        pipeline_start = time.time()
        stage_timings: Dict[str, float] = {}

        # STAGE 1: Markdown Conversion & Media Extraction
        t0 = time.time()
        conversion_result = self.converter.convert(file_path, output_media_dir=media_dir)
        raw_markdown = conversion_result["markdown"]
        file_type = conversion_result["file_type"]
        extracted_images = conversion_result.get("extracted_images", [])
        extracted_audio = conversion_result.get("extracted_audio", [])
        records = conversion_result.get("records", [])
        stage_timings["conversion_sec"] = round(time.time() - t0, 2)

        # Save job dataset records if available
        if records:
            (job_dir / "active_dataset.json").write_text(json.dumps(records, default=str), encoding="utf-8")

        # Save media metadata in isolated job folder
        media_meta = {
            "job_id": job_id,
            "extracted_images": extracted_images,
            "extracted_audio": extracted_audio
        }
        (job_dir / "active_media_assets.json").write_text(json.dumps(media_meta, indent=2), encoding="utf-8")

        # Save 01_raw_converted.md
        (job_dir / "01_raw_converted.md").write_text(raw_markdown, encoding="utf-8")

        # STAGE 2: Reasoning & Analytical Extraction
        t0 = time.time()
        analysis_res = self.ai_client.analyze_document(
            markdown_content=raw_markdown,
            custom_command=custom_analysis_cmd
        )
        stage_timings["analysis_sec"] = round(time.time() - t0, 2)
        analysis_text = analysis_res.get("analysis", "")

        # Save 02_analysis.md
        (job_dir / "02_llama_analysis.md").write_text(analysis_text, encoding="utf-8")

        # STAGE 3: Deterministic Mathematical Calculation & Audit
        t0 = time.time()
        math_audit = self.math_engine.process_math_checks(
            analysis_text=analysis_text,
            custom_calculations=custom_calculations
        )
        stage_timings["math_sec"] = round(time.time() - t0, 2)

        # Save 03_math_audit.json and markdown table
        (job_dir / "03_math_audit.json").write_text(
            json.dumps(math_audit, indent=2), encoding="utf-8"
        )

        # STAGE 4: Report Synthesis
        t0 = time.time()
        synthesis_res = self.ai_client.generate_systematic_report(
            analysis=analysis_text,
            math_audit_markdown=math_audit["audit_markdown"],
            custom_instructions=custom_report_cmd
        )
        stage_timings["synthesis_sec"] = round(time.time() - t0, 2)
        final_report = synthesis_res.get("final_report", "")

        # Save 04_final_systematic_report.md
        (job_dir / "04_final_systematic_report.md").write_text(final_report, encoding="utf-8")

        # STAGE 5: Multi-Format Document Compilation (PDF, DOCX, XLSX with Embedded Images)
        t0 = time.time()
        from backend.services.document_generator import DocumentGenerator
        doc_gen = DocumentGenerator(output_dir=job_dir)
        summary_to_use = final_report if final_report.strip() else analysis_text
        doc_pkg = doc_gen.generate_all_packages(
            template_name="aurora_gradient",
            report_id=job_id,
            summary_text=summary_to_use,
            user_records=records,
            images=[img["path"] for img in extracted_images] if extracted_images else None,
            document_title=file_path.stem.replace("_", " ").title()
        )
        stage_timings["doc_gen_sec"] = round(time.time() - t0, 2)

        total_duration = round(time.time() - pipeline_start, 2)

        # Save summary metadata
        summary_meta = {
            "job_id": job_id,
            "filename": file_path.name,
            "file_type": file_type,
            "total_duration_sec": total_duration,
            "stage_timings_sec": stage_timings,
            "ai_model": analysis_res.get("model_used"),
            "math_checks_count": math_audit["total_checks"],
            "images_extracted_count": len(extracted_images),
            "audio_extracted_count": len(extracted_audio),
            "status": "COMPLETED"
        }
        (job_dir / "metadata.json").write_text(json.dumps(summary_meta, indent=2), encoding="utf-8")

        from backend.services.history_manager import record_report
        record_report(
            report_id=job_id,
            title=f"{file_path.stem.replace('_', ' ').title()} Dossier",
            template_id="aurora_gradient",
            template_name="Aurora Modern Presentation",
            theme="Aurora Vibrant Gradient",
            records_count=len(records) if records else 1,
            summary_snippet=summary_to_use[:200]
        )

        return {
            "job_id": job_id,
            "success": True,
            "metadata": summary_meta,
            "raw_markdown": raw_markdown,
            "analysis": analysis_text,
            "math_audit": math_audit,
            "final_report": final_report,
            "report_package": doc_pkg,
            "output_directory": str(job_dir)
        }

    def process_file_stream(
        self,
        file_path: Path,
        custom_analysis_cmd: Optional[str] = None,
        custom_calculations: Optional[List[Dict[str, Any]]] = None,
        custom_report_cmd: Optional[str] = None,
        model_override: Optional[str] = None,
        **kwargs
    ):
        """Yields real-time SSE progress events as each pipeline stage completes."""
        job_id = f"job_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        job_dir = config.OUTPUTS_DIR / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        media_dir = job_dir / "extracted_media"
        media_dir.mkdir(parents=True, exist_ok=True)

        pipeline_start = time.time()
        stage_timings: Dict[str, float] = {}

        yield {
            "stage": "init",
            "progress": 10,
            "message": f"Initialized pipeline for {file_path.name}. Verifying local AI models...",
            "job_id": job_id
        }

        # STAGE 1: Markdown Conversion & Media Extraction
        yield {
            "stage": "converting",
            "progress": 25,
            "message": "Extracting schema, tables, text, and isolating embedded media without truncation...",
            "job_id": job_id
        }
        t0 = time.time()
        conversion_result = self.converter.convert(file_path, output_media_dir=media_dir)
        raw_markdown = conversion_result["markdown"]
        file_type = conversion_result["file_type"]
        extracted_images = conversion_result.get("extracted_images", [])
        extracted_audio = conversion_result.get("extracted_audio", [])
        records = conversion_result.get("records", [])
        stage_timings["conversion_sec"] = round(time.time() - t0, 2)
        (job_dir / "01_raw_converted.md").write_text(raw_markdown, encoding="utf-8")

        if records:
            (job_dir / "active_dataset.json").write_text(json.dumps(records, default=str), encoding="utf-8")

        media_meta = {
            "job_id": job_id,
            "extracted_images": extracted_images,
            "extracted_audio": extracted_audio
        }
        (job_dir / "active_media_assets.json").write_text(json.dumps(media_meta, indent=2), encoding="utf-8")

        # STAGE 2: Reasoning & Extraction
        yield {
            "stage": "analysis",
            "progress": 55,
            "message": "Analyzing data relationships & numerical structures...",
            "job_id": job_id,
            "stage_info": f"Converted {len(raw_markdown)} characters of Markdown"
        }
        t0 = time.time()
        analysis_res = self.ai_client.analyze_document(
            markdown_content=raw_markdown,
            custom_command=custom_analysis_cmd
        )
        stage_timings["analysis_sec"] = round(time.time() - t0, 2)
        analysis_text = analysis_res.get("analysis", "")
        (job_dir / "02_llama_analysis.md").write_text(analysis_text, encoding="utf-8")

        # STAGE 3: Deterministic Mathematical Calculation & Audit
        yield {
            "stage": "math",
            "progress": 75,
            "message": "Deterministic Math Engine is auditing formulas, cross-checking totals, and verifying calculations...",
            "job_id": job_id
        }
        t0 = time.time()
        math_audit = self.math_engine.process_math_checks(
            analysis_text=analysis_text,
            custom_calculations=custom_calculations
        )
        stage_timings["math_sec"] = round(time.time() - t0, 2)
        (job_dir / "03_math_audit.json").write_text(json.dumps(math_audit, indent=2), encoding="utf-8")

        # STAGE 4: Report Synthesis
        yield {
            "stage": "synthesis",
            "progress": 90,
            "message": "Formatting executive insights and integrating figures into publication template...",
            "job_id": job_id,
            "verified_math_count": math_audit["total_checks"],
            "multimedia_count": len(extracted_images) + len(extracted_audio)
        }
        t0 = time.time()
        synthesis_res = self.ai_client.generate_systematic_report(
            analysis=analysis_text,
            math_audit_markdown=math_audit["audit_markdown"],
            custom_instructions=custom_report_cmd
        )
        stage_timings["synthesis_sec"] = round(time.time() - t0, 2)
        final_report = synthesis_res.get("final_report", "")
        (job_dir / "04_final_systematic_report.md").write_text(final_report, encoding="utf-8")

        # STAGE 5: Document Generation
        yield {
            "stage": "document_gen",
            "progress": 95,
            "message": "Compiling PDF, Word DOCX, and Multi-Sheet Excel Workbooks...",
            "job_id": job_id
        }
        from backend.services.document_generator import DocumentGenerator
        doc_gen = DocumentGenerator(output_dir=job_dir)
        summary_to_use = final_report if final_report.strip() else analysis_text
        doc_pkg = doc_gen.generate_all_packages(
            template_name="aurora_gradient",
            report_id=job_id,
            summary_text=summary_to_use,
            user_records=records,
            images=[img["path"] for img in extracted_images] if extracted_images else None,
            document_title=file_path.stem.replace("_", " ").title()
        )

        total_duration = round(time.time() - pipeline_start, 2)

        summary_meta = {
            "job_id": job_id,
            "filename": file_path.name,
            "file_type": file_type,
            "total_duration_sec": total_duration,
            "stage_timings_sec": stage_timings,
            "ai_model": analysis_res.get("model_used"),
            "math_checks_count": math_audit["total_checks"],
            "images_extracted_count": len(extracted_images),
            "audio_extracted_count": len(extracted_audio),
            "status": "COMPLETED"
        }
        (job_dir / "metadata.json").write_text(json.dumps(summary_meta, indent=2), encoding="utf-8")

        from backend.services.history_manager import record_report
        record_report(
            report_id=job_id,
            title=f"{file_path.stem.replace('_', ' ').title()} Dossier",
            template_id="aurora_gradient",
            template_name="Aurora Modern Presentation",
            theme="Aurora Vibrant Gradient",
            records_count=len(records) if records else 1,
            summary_snippet=summary_to_use[:200]
        )

        full_result = {
            "job_id": job_id,
            "success": True,
            "metadata": summary_meta,
            "raw_markdown": raw_markdown,
            "analysis": analysis_text,
            "math_audit": math_audit,
            "final_report": final_report,
            "report_package": doc_pkg,
            "output_directory": str(job_dir)
        }

        yield {
            "stage": "complete",
            "progress": 100,
            "message": "Intelligence pipeline completed successfully! Dossier ready for review.",
            "job_id": job_id,
            "result": full_result
        }
