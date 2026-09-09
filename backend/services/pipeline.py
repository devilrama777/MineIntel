import json
import logging
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend import config
from backend.services.converter import MarkdownConverter
from backend.services.gemma_client import GemmaClient
from backend.services.llama_client import LlamaClient
from backend.services.math_engine import MathEngine

logger = logging.getLogger("mineintel.pipeline")


class DocumentPipeline:
    """Orchestrates document conversion, reasoning, math audit, and report generation."""

    def __init__(self):
        self.converter = MarkdownConverter()
        self.llama_client = LlamaClient()
        self.math_engine = MathEngine()
        self.gemma_client = GemmaClient()

    def process_file(
        self,
        file_path: Path,
        custom_llama_cmd: Optional[str] = None,
        custom_calculations: Optional[List[Dict[str, Any]]] = None,
        custom_report_cmd: Optional[str] = None,
        llama_model_override: Optional[str] = None,
        gemma_model_override: Optional[str] = None,
        route_multimedia_to_gemma: bool = True
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
        has_multimedia = conversion_result.get("has_multimedia", False)
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

        # STAGE 2: Reasoning & Analytical Extraction (bounded chunking supported)
        t0 = time.time()
        should_bypass_llama_media = route_multimedia_to_gemma and has_multimedia
        llama_res = self.llama_client.analyze_document(
            markdown_content=raw_markdown,
            file_type=file_type,
            custom_command=custom_llama_cmd,
            model=llama_model_override,
            bypass_media=should_bypass_llama_media
        )
        stage_timings["llama_sec"] = round(time.time() - t0, 2)
        llama_analysis = llama_res.get("analysis", "")

        # Save 02_llama_analysis.md
        (job_dir / "02_llama_analysis.md").write_text(llama_analysis, encoding="utf-8")

        # STAGE 3: Deterministic Mathematical Calculation & Audit
        t0 = time.time()
        math_audit = self.math_engine.process_math_checks(
            analysis_text=llama_analysis,
            custom_calculations=custom_calculations
        )
        stage_timings["math_sec"] = round(time.time() - t0, 2)

        # Save 03_math_audit.json and markdown table
        (job_dir / "03_math_audit.json").write_text(
            json.dumps(math_audit, indent=2), encoding="utf-8"
        )

        # STAGE 4: Report Synthesis
        t0 = time.time()
        gemma_res = self.gemma_client.generate_systematic_report(
            llama_analysis=llama_analysis,
            math_audit_markdown=math_audit["audit_markdown"],
            custom_instructions=custom_report_cmd,
            model_override=gemma_model_override,
            extracted_images=extracted_images,
            extracted_audio=extracted_audio,
            document_title=file_path.stem.replace("_", " ").title()
        )
        stage_timings["gemma_sec"] = round(time.time() - t0, 2)
        final_report = gemma_res.get("final_report", "")

        # Save 04_final_systematic_report.md
        (job_dir / "04_final_systematic_report.md").write_text(final_report, encoding="utf-8")

        # STAGE 5: Multi-Format Document Compilation (PDF, DOCX, XLSX with Embedded Images)
        t0 = time.time()
        from backend.services.document_generator import DocumentGenerator
        doc_gen = DocumentGenerator(output_dir=job_dir)
        summary_to_use = final_report if final_report.strip() else llama_analysis
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
            "llama_model": llama_res.get("model_used"),
            "gemma_model": gemma_res.get("model_used"),
            "is_fallback": llama_res.get("is_fallback", False) or gemma_res.get("is_fallback", False),
            "math_checks_count": math_audit["total_checks"],
            "multimodal_routed_to_gemma": should_bypass_llama_media,
            "images_extracted_count": len(extracted_images),
            "audio_extracted_count": len(extracted_audio),
            "status": "COMPLETED"
        }
        (job_dir / "metadata.json").write_text(json.dumps(summary_meta, indent=2), encoding="utf-8")

        # Record into history
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
            "llama_analysis": llama_analysis,
            "math_audit": math_audit,
            "final_report": final_report,
            "extracted_images": extracted_images,
            "extracted_audio": extracted_audio,
            "report_package": doc_pkg,
            "output_directory": str(job_dir)
        }

    def process_file_stream(
        self,
        file_path: Path,
        custom_llama_cmd: Optional[str] = None,
        custom_calculations: Optional[List[Dict[str, Any]]] = None,
        custom_report_cmd: Optional[str] = None,
        llama_model_override: Optional[str] = None,
        gemma_model_override: Optional[str] = None,
        route_multimedia_to_gemma: bool = True
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
        has_multimedia = conversion_result.get("has_multimedia", False)
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
        should_bypass_llama_media = route_multimedia_to_gemma and has_multimedia
        msg_media = f" ({len(extracted_images)} images isolated)" if should_bypass_llama_media else ""
        yield {
            "stage": "llama",
            "progress": 55,
            "message": f"Analyzing data relationships & numerical structures{msg_media}...",
            "job_id": job_id,
            "stage_info": f"Converted {len(raw_markdown)} characters of Markdown"
        }
        t0 = time.time()
        llama_res = self.llama_client.analyze_document(
            markdown_content=raw_markdown,
            file_type=file_type,
            custom_command=custom_llama_cmd,
            model=llama_model_override,
            bypass_media=should_bypass_llama_media
        )
        stage_timings["llama_sec"] = round(time.time() - t0, 2)
        llama_analysis = llama_res.get("analysis", "")
        (job_dir / "02_llama_analysis.md").write_text(llama_analysis, encoding="utf-8")

        # STAGE 3: Deterministic Mathematical Calculation & Audit
        yield {
            "stage": "math",
            "progress": 75,
            "message": "Deterministic Math Engine is auditing formulas, cross-checking totals, and verifying calculations...",
            "job_id": job_id
        }
        t0 = time.time()
        math_audit = self.math_engine.process_math_checks(
            analysis_text=llama_analysis,
            custom_calculations=custom_calculations
        )
        stage_timings["math_sec"] = round(time.time() - t0, 2)
        (job_dir / "03_math_audit.json").write_text(json.dumps(math_audit, indent=2), encoding="utf-8")

        # STAGE 4: Report Synthesis
        yield {
            "stage": "gemma",
            "progress": 90,
            "message": "Formatting executive insights and integrating figures into publication template...",
            "job_id": job_id,
            "verified_math_count": math_audit["total_checks"],
            "multimedia_count": len(extracted_images) + len(extracted_audio)
        }
        t0 = time.time()
        gemma_res = self.gemma_client.generate_systematic_report(
            llama_analysis=llama_analysis,
            math_audit_markdown=math_audit["audit_markdown"],
            custom_instructions=custom_report_cmd,
            model_override=gemma_model_override,
            extracted_images=extracted_images,
            extracted_audio=extracted_audio,
            document_title=file_path.stem.replace("_", " ").title()
        )
        stage_timings["gemma_sec"] = round(time.time() - t0, 2)
        final_report = gemma_res.get("final_report", "")
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
        summary_to_use = final_report if final_report.strip() else llama_analysis
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
            "llama_model": llama_res.get("model_used"),
            "gemma_model": gemma_res.get("model_used"),
            "is_fallback": llama_res.get("is_fallback", False) or gemma_res.get("is_fallback", False),
            "math_checks_count": math_audit["total_checks"],
            "multimodal_routed_to_gemma": should_bypass_llama_media,
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
            "llama_analysis": llama_analysis,
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
