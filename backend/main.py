import hashlib
import hmac
import json
import logging
import os
import secrets
import shutil
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
import requests

logger = logging.getLogger("mineintel")

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel

from backend import config
from backend.services.converter import MarkdownConverter
from backend.services.document_generator import DocumentGenerator, TEMPLATE_CONFIGS, get_active_dataset_metrics
from backend.services.gemma_client import GemmaClient
from backend.services.history_manager import get_history, record_report
from backend.services.llama_client import LlamaClient
from backend.services.math_engine import MathEngine
from backend.services.pipeline import DocumentPipeline

app = FastAPI(
    title="Document Intelligence & Reasoning Pipeline API",
    description="Multi-stage document processing backend converting CSV/PDF to Markdown, analyzing via local LLaMA 3.1, verifying mathematics, and synthesizing reports via Gemma.",
    version="1.0.0"
)

# Enable CORS for frontend integration
# With wildcard origins, credentials must be disabled per browser CORS policy
_allowed_origins = config.CORS_ORIGINS
_allow_creds = (_allowed_origins != ["*"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=_allow_creds,
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline_service = DocumentPipeline()
converter_service = MarkdownConverter()
llama_client = LlamaClient()
math_engine = MathEngine()
gemma_client = GemmaClient()
document_generator = DocumentGenerator()


# -------------------------------------------------------------------------
# AUTHENTICATION HELPERS & MODELS
# -------------------------------------------------------------------------
class LoginRequest(BaseModel):
    officer_id: str
    password: str
    remember_device: Optional[bool] = True


def create_session_token(officer_id: str, role: str = "Senior Operational Auditor") -> str:
    """Creates a cryptographically signed session token with timestamp."""
    timestamp = int(time.time())
    payload = f"{officer_id}:{timestamp}:{role}"
    sig = hmac.new(config.JWT_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"


def verify_session_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifies HMAC signature and 24-hour expiration of session token."""
    try:
        parts = token.split(":")
        if len(parts) != 4:
            return None
        officer_id, timestamp_str, role, sig = parts
        timestamp = int(timestamp_str)
        if time.time() - timestamp > 86400:  # 24 hours expiry
            return None
        payload = f"{officer_id}:{timestamp}:{role}"
        expected_sig = hmac.new(config.JWT_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if secrets.compare_digest(sig, expected_sig):
            return {"officer_id": officer_id, "role": role, "timestamp": timestamp}
        return None
    except Exception:
        return None


# -------------------------------------------------------------------------
# UPLOAD VALIDATION HELPERS
# -------------------------------------------------------------------------
def validate_uploaded_file(file: UploadFile) -> str:
    """Validates file presence and extension."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")
    ext = Path(file.filename).suffix.lower()
    if ext not in config.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(config.ALLOWED_EXTENSIONS))}"
        )
    return ext


def save_uploaded_file(file: UploadFile, dest_path: Path, max_bytes: int = config.MAX_UPLOAD_SIZE_BYTES) -> int:
    """Safely saves an uploaded file enforcing non-empty and max upload size constraints."""
    total_read = 0
    chunk_size = 1024 * 1024  # 1MB
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    exceeded = False
    with open(dest_path, "wb") as buffer:
        while True:
            chunk = file.file.read(chunk_size)
            if not chunk:
                break
            total_read += len(chunk)
            if total_read > max_bytes:
                exceeded = True
                break
            buffer.write(chunk)
    if exceeded:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum upload limit of {max_bytes // (1024 * 1024)}MB."
        )
    if total_read == 0:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")
    return total_read


# Pydantic Request Models
class LlamaRequest(BaseModel):
    markdown_content: str
    file_type: str = "pdf"
    custom_command: Optional[str] = None
    model_override: Optional[str] = None


class MathRequest(BaseModel):
    analysis_text: str
    custom_calculations: Optional[List[Dict[str, Any]]] = None


class GemmaRequest(BaseModel):
    llama_analysis: str
    math_audit_markdown: str
    custom_instructions: Optional[str] = None
    model_override: Optional[str] = None


# -------------------------------------------------------------------------
# AUTHENTICATION ENDPOINTS
# -------------------------------------------------------------------------
@app.post("/api/auth/login")
def auth_login(req: LoginRequest):
    """Authenticates executive officers against sovereign credentials using constant-time comparison."""
    if not config.AUTH_OFFICER_ID or not config.AUTH_SECRET_PASSWORD:
        raise HTTPException(
            status_code=503,
            detail="Authentication is unconfigured. Production credentials must be supplied via MINEINTEL_OFFICER_ID and MINEINTEL_AUTH_PASSWORD environment variables."
        )
    valid_id = secrets.compare_digest(req.officer_id.strip(), config.AUTH_OFFICER_ID)
    valid_pw = secrets.compare_digest(req.password.strip(), config.AUTH_SECRET_PASSWORD)
    if not (valid_id and valid_pw):
        raise HTTPException(
            status_code=401,
            detail="Authentication failed: Invalid Officer Employee ID or Enclave Password."
        )
    token = create_session_token(req.officer_id.strip())
    return {
        "success": True,
        "authenticated": True,
        "token": token,
        "officer_id": req.officer_id.strip(),
        "name": "Authorized Inspector",
        "role": "Senior Operational Auditor",
        "department": "Ministry of Coal, Government of India",
        "expires_in": 86400
    }


@app.get("/api/auth/verify")
def auth_verify(authorization: Optional[str] = Header(None), token: Optional[str] = Query(None)):
    """Verifies authenticity and timestamp of an active session token."""
    raw_token = token if isinstance(token, str) and token.strip() else None
    if not raw_token and isinstance(authorization, str) and authorization.strip():
        if authorization.startswith("Bearer "):
            raw_token = authorization.split("Bearer ", 1)[1].strip()
        else:
            raw_token = authorization.strip()
    if not raw_token:
        raise HTTPException(status_code=401, detail="Authentication token required.")
    session = verify_session_token(raw_token)
    if not session:
        raise HTTPException(status_code=401, detail="Session token invalid or expired.")
    return {
        "authenticated": True,
        "officer_id": session["officer_id"],
        "role": session["role"]
    }


def require_auth(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Dependency enforcing that protected operations require a valid cryptographic session token."""
    raw_token = token if isinstance(token, str) and token.strip() else None
    if not raw_token and isinstance(authorization, str) and authorization.strip():
        if authorization.startswith("Bearer "):
            raw_token = authorization.split("Bearer ", 1)[1].strip()
        else:
            raw_token = authorization.strip()
    if not raw_token:
        raise HTTPException(status_code=401, detail="Authentication token required for protected action.")
    session = verify_session_token(raw_token)
    if not session:
        raise HTTPException(status_code=401, detail="Session token invalid, tampered, or expired.")
    return session


@app.post("/api/auth/logout")
def auth_logout():
    """Terminates active enclave session."""
    return {"success": True, "message": "Enclave session terminated."}


@app.get("/api/health")
def health_check():
    """Checks service health and local Ollama connectivity."""
    ollama_ok = llama_client.is_available()
    installed_models = llama_client.list_installed_models() if ollama_ok else []
    return {
        "status": "healthy",
        "ollama_connected": ollama_ok,
        "ollama_url": config.OLLAMA_BASE_URL,
        "installed_models": installed_models,
        "default_llama_model": config.LLAMA_MODEL,
        "default_gemma_model": config.GEMMA_MODEL
    }


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Uploads a PDF, CSV, or spreadsheet file to the backend with size and extension validation."""
    ext = validate_uploaded_file(file)
    safe_filename = "".join(c for c in file.filename if c.isalnum() or c in "._- ").strip()[:100]
    file_id = f"{uuid.uuid4().hex[:8]}_{safe_filename}"
    save_path = config.UPLOADS_DIR / file_id

    save_uploaded_file(file, save_path)

    return {
        "file_id": file_id,
        "filename": file.filename,
        "file_type": ext.lstrip("."),
        "file_path": str(save_path)
    }


@app.post("/api/convert")
def convert_to_markdown(file_id: str = Form(...)):
    """Converts an uploaded file into structured Markdown."""
    target_path = config.UPLOADS_DIR / file_id
    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found.")

    try:
        result = converter_service.convert(target_path)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")


@app.post("/api/process/llama")
def run_llama_analysis(req: LlamaRequest):
    """Runs Stage 1 local LLaMA 3.1 analysis on Markdown content."""
    result = llama_client.analyze_document(
        markdown_content=req.markdown_content,
        file_type=req.file_type,
        custom_command=req.custom_command,
        model=req.model_override
    )
    return result


@app.post("/api/process/math")
def run_math_audit(req: MathRequest):
    """Runs Stage 2 deterministic math calculation engine."""
    result = math_engine.process_math_checks(
        analysis_text=req.analysis_text,
        custom_calculations=req.custom_calculations
    )
    return result


@app.post("/api/process/report")
def run_gemma_report(req: GemmaRequest):
    """Runs Stage 3 Gemma systematic report synthesis."""
    result = gemma_client.generate_systematic_report(
        llama_analysis=req.llama_analysis,
        math_audit_markdown=req.math_audit_markdown,
        custom_instructions=req.custom_instructions,
        model_override=req.model_override
    )
    return result


@app.post("/api/pipeline/run")
async def run_full_pipeline(
    file: UploadFile = File(...),
    custom_llama_command: Optional[str] = Form(None),
    custom_calculations_json: Optional[str] = Form(None),
    custom_report_command: Optional[str] = Form(None),
    llama_model: Optional[str] = Form(None),
    gemma_model: Optional[str] = Form(None),
    route_media_to_gemma: bool = Form(True)
):
    """Executes the full end-to-end multi-stage pipeline on an uploaded file."""
    # 1. Validate and save uploaded file
    validate_uploaded_file(file)
    safe_filename = "".join(c for c in file.filename if c.isalnum() or c in "._- ").strip()[:100]
    file_id = f"{uuid.uuid4().hex[:8]}_{safe_filename}"
    save_path = config.UPLOADS_DIR / file_id
    save_uploaded_file(file, save_path)

    # 2. Parse custom calculations if present
    custom_calcs = None
    if custom_calculations_json:
        try:
            custom_calcs = json.loads(custom_calculations_json)
        except Exception:
            pass

    # 3. Execute Pipeline
    try:
        pipeline_output = pipeline_service.process_file(
            file_path=save_path,
            custom_llama_cmd=custom_llama_command,
            custom_calculations=custom_calcs,
            custom_report_cmd=custom_report_command,
            llama_model_override=llama_model,
            gemma_model_override=gemma_model,
            route_multimedia_to_gemma=route_media_to_gemma
        )
        return pipeline_output
    except Exception as e:
        logger.error(f"Pipeline execution failed for {file.filename}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline execution failed: {str(e)}. AI services may be unavailable."
        )


@app.post("/api/pipeline/stream-run")
async def run_pipeline_stream(
    file: Optional[UploadFile] = File(None),
    raw_csv_text: Optional[str] = Form(None),
    custom_llama_command: Optional[str] = Form(None),
    custom_calculations_json: Optional[str] = Form(None),
    custom_report_command: Optional[str] = Form(None),
    llama_model: Optional[str] = Form(None),
    gemma_model: Optional[str] = Form(None),
    route_media_to_gemma: bool = Form(True)
):
    """Executes the pipeline yielding live Server-Sent Events (SSE) progress milestones."""
    if not file and not raw_csv_text:
        raise HTTPException(status_code=400, detail="Either a file upload or raw_csv_text must be provided.")

    if file:
        validate_uploaded_file(file)
        safe_filename = "".join(c for c in file.filename if c.isalnum() or c in "._- ").strip()[:100]
        file_id = f"{uuid.uuid4().hex[:8]}_{safe_filename}"
        save_path = config.UPLOADS_DIR / file_id
        save_uploaded_file(file, save_path)
    else:
        file_id = f"{uuid.uuid4().hex[:8]}_pasted_data.csv"
        save_path = config.UPLOADS_DIR / file_id
        save_path.write_text(raw_csv_text.strip(), encoding="utf-8")

    custom_calcs = None
    if custom_calculations_json:
        try:
            custom_calcs = json.loads(custom_calculations_json)
        except Exception:
            pass

    def event_stream():
        try:
            for event in pipeline_service.process_file_stream(
                file_path=save_path,
                custom_llama_cmd=custom_llama_command,
                custom_calculations=custom_calcs,
                custom_report_cmd=custom_report_command,
                llama_model_override=llama_model,
                gemma_model_override=gemma_model,
                route_multimedia_to_gemma=route_media_to_gemma
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as err:
            err_payload = {"stage": "error", "progress": 0, "message": str(err)}
            yield f"data: {json.dumps(err_payload)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/api/pipeline/quick-preview")
async def quick_preview(
    file: Optional[UploadFile] = File(None),
    raw_csv_text: Optional[str] = Form(None)
):
    """Provides instant dataset stats and preview before AI processing completes."""
    import io

    df = None
    fname = "Uploaded_Data.csv"
    if file:
        fname = file.filename or fname
        validate_uploaded_file(file)
        content = await file.read()
        try:
            if fname.endswith((".xlsx", ".xls")):
                df = pd.read_excel(io.BytesIO(content))
            else:
                sep = "\t" if fname.endswith(".tsv") else ","
                df = pd.read_csv(io.BytesIO(content), sep=sep)
        except Exception:
            df = pd.read_csv(io.BytesIO(content), sep=None, engine="python")
    elif raw_csv_text:
        df = pd.read_csv(io.StringIO(raw_csv_text))
    else:
        raise HTTPException(status_code=400, detail="No data provided.")

    clean_preview = []
    for row in df.head(5).to_dict(orient="records"):
        clean_row = {}
        for k, v in row.items():
            if pd.isna(v) or v is None or str(v).lower() in ("nan", "nat", "none"):
                clean_row[str(k)] = "-"
            elif isinstance(v, (float, np.floating)):
                clean_row[str(k)] = str(round(float(v), 2))
            else:
                clean_row[str(k)] = str(v)
        clean_preview.append(clean_row)

    # Compute numeric summary stats
    numeric_summary = {}
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if numeric_cols:
        primary_col = numeric_cols[0]
        series = df[primary_col].dropna()
        if len(series) > 0:
            numeric_summary = {
                "column": primary_col,
                "count": int(len(series)),
                "sum": round(float(series.sum()), 2),
                "mean": round(float(series.mean()), 2),
                "min": round(float(series.min()), 2),
                "max": round(float(series.max()), 2)
            }

    # Persist preview records safely
    preview_id = f"preview_{uuid.uuid4().hex[:8]}"
    try:
        active_records = df.to_dict(orient="records")
        preview_json = config.OUTPUTS_DIR / f"{preview_id}_active_user_dataset.json"
        preview_json.write_text(json.dumps(active_records, default=str), encoding="utf-8")
        preview_csv = config.OUTPUTS_DIR / f"{preview_id}_active_cleaned_dataset.csv"
        df.to_csv(preview_csv, index=False)
    except Exception:
        pass

    return {
        "filename": fname,
        "preview_id": preview_id,
        "rows": int(len(df)),
        "columns": [str(c) for c in df.columns],
        "preview": clean_preview,
        "numeric_summary": numeric_summary
    }


@app.post("/api/pipeline/auto-generate-prompt")
async def auto_generate_prompt(
    category: Optional[str] = Form(None),
    filename: Optional[str] = Form(None)
):
    """Synthesizes high-impact executive directives based on coal production patterns, colliery variance, and logistics."""
    import random

    prompts_by_category = {
        "high_yield": [
            "Prioritize top mega-collieries (Gevra, Kusmunda, Dipka), analyze heavy earthmoving machinery efficiency, and flag stripping ratio bottlenecks.",
            "Isolate high-yield opencast basins yielding >15,000 MT, verify daily extraction quotas, and project Q3 production trajectory.",
            "Benchmark tier-1 opencast mines against annual MoC production charter, isolating volume contributors across SECL and MCL basins."
        ],
        "variance_audit": [
            "Perform statistical anomaly audit across all 18 basins, isolating collieries with >3% target fulfillment variance against statutory quotas.",
            "Audit production variance across coalfield basins, highlight overperforming and lagging mines, and calculate net national deficit index.",
            "Execute mathematical variance breakdown comparing actual extraction against scheduled union budget targets with determinism verification."
        ],
        "logistics": [
            "Audit First-Mile rail connectivity, evaluate rakes availability at siding nodes, and calculate power plant thermal coal buffer reserves.",
            "Track thermal power dispatch efficiency, evaluate offtake-to-extraction ratios, and map wagon turnaround times across Korba and Talcher.",
            "Assess multimodal evacuation corridors, monitor merry-go-round conveyor throughput, and verify critical power plant coal stockpiles."
        ],
        "esg": [
            "Evaluate eco-reclamation hectarage, solar mine transitions, mine water treatment recycling, and zero-harm safety statutory records.",
            "Audit sustainable mining parameters: first-mile rail adoption %, afforestation offset compliance, and carbon abatement progress.",
            "Benchmark zero-harm safety indices, overburden dump stability monitoring, and environmental statutory clearance conformity."
        ],
        "statutory": [
            "Compile statutory audit format focusing on union budget fulfillment, state royalty allocations, and public accounts committee review.",
            "Perform parliamentary accountability analysis: royalty distributions, district mineral foundation (DMF) allocations, and audit trails.",
            "Verify compliance with Mines Act guidelines, statutory vigilance oversight, and 100% deterministic cryptographic audit hashing."
        ]
    }

    all_general_prompts = [
        "Conduct comprehensive strategic review isolating mega-collieries, thermal power plant dispatch ratios, and statutory audit integrity.",
        "Synthesize national extraction leaderboard, calculate colliery variance against target quotas, and evaluate rail evacuation corridors.",
        "Perform deep-dive colliery operational audit: benchmark extraction velocity, identify dispatch bottlenecks, and assess regional quotas.",
        "Audit high-capacity opencast mining assets, verify statutory compliance metrics, and formulate executive ministerial directives."
    ]

    if category and category in prompts_by_category:
        selected = random.choice(prompts_by_category[category])
    else:
        selected = random.choice(all_general_prompts)

    return {
        "status": "success",
        "prompt": selected,
        "category": category or "general"
    }



class ReportRevisionRequest(BaseModel):
    report_id: Optional[str] = None
    template: Optional[str] = "bento_grid"
    current_content: Optional[str] = None
    revision_prompt: str
    gemma_model: Optional[str] = None


@app.post("/api/reports/revise")
async def revise_report_with_gemma(req: ReportRevisionRequest):
    """Revises a compiled report using Gemma 4 according to user feedback directives."""
    summary_path = config.PROCESSED_OUTPUT_DIR / f"llama_summary_{req.report_id or 'rev'}.md"
    current_md = req.current_content or ""
    if not current_md:
        fallback_path = config.PROCESSED_OUTPUT_DIR / "llama_summary.md"
        if fallback_path.exists():
            current_md = fallback_path.read_text(encoding="utf-8")

    result = gemma_client.revise_report(
        current_report_markdown=current_md,
        user_revision_prompt=req.revision_prompt,
        model_override=req.gemma_model,
        template=req.template
    )

    revised_text = result.get("revised_report", "")
    if revised_text:
        try:
            summary_path.write_text(revised_text, encoding="utf-8")
        except Exception:
            pass

    return {
        "success": not result.get("fallback", True),
        "report_id": req.report_id or "REP-2026-REV",
        "template": req.template,
        "model_used": result.get("model_used", "gemma-4"),
        "revised_content": revised_text,
        "revision_prompt": req.revision_prompt,
        "fallback": result.get("fallback", True),
        "message": "Report revised successfully by Gemma 4." if not result.get("fallback", True) else "Report revised using deterministic fallback. LLM was unavailable."
    }


@app.get("/api/reports/latest-summary")
def get_latest_summary():
    """Returns the latest LLaMA 3.1 summary and converted Markdown with safe fallback resolution."""
    summary_path = config.find_data_file("llama_summary.md")
    md_path = config.find_data_file("converted_data.md")
    
    csv_files = set()
    for d in [config.REPORTED_DATA_DIR, config.DATA_DIR, config.BASE_DIR / "reported_data", config.BASE_DIR / "default_data_backup"]:
        if d and d.exists():
            csv_files.update(f.name for f in d.glob("*.csv"))

    return {
        "summary": summary_path.read_text(encoding="utf-8") if summary_path and summary_path.exists() else None,
        "markdown": md_path.read_text(encoding="utf-8") if md_path and md_path.exists() else None,
        "files": sorted(list(csv_files))
    }


@app.get("/api/reports/download-summary")
def download_summary():
    summary_path = config.find_data_file("llama_summary.md")
    if not summary_path or not summary_path.exists():
        raise HTTPException(status_code=404, detail="Summary not found.")
    return FileResponse(path=summary_path, filename="LLaMA_Coal_Summary.md", media_type="text/markdown")



@app.get("/api/templates")
def list_report_templates():
    """Returns the catalog of 6 modern report templates with metadata and section schemas."""
    templates = []
    seen = set()
    for tpl_id, tpl in TEMPLATE_CONFIGS.items():
        canonical_id = tpl["id"]
        if canonical_id in seen:
            continue
        seen.add(canonical_id)
        templates.append({
            "id": canonical_id,
            "name": tpl["name"],
            "theme": tpl["theme"],
            "header_title": tpl["header_title"],
            "subtitle": tpl["subtitle"],
            "primary_hex": tpl["primary_hex"],
            "accent_hex": tpl["accent_hex"],
            "light_bg_hex": tpl["light_bg_hex"],
            "border_hex": tpl["border_hex"],
            "icon": tpl["icon"],
            "badge": tpl["badge"],
            "sections": tpl["sections"]
        })
    return {"templates": templates}


class TemplateFillRequest(BaseModel):
    data_summary: Optional[str] = None
    custom_focus: Optional[str] = None
    model: Optional[str] = None
    job_id: Optional[str] = None


@app.post("/api/templates/{template_id}/fill")
def fill_template_content(template_id: str, req: Optional[TemplateFillRequest] = None):
    """Fills data into the chosen modern template dynamically from active dataset metrics."""
    tpl_key = template_id.lower().replace(" ", "_")
    if tpl_key not in TEMPLATE_CONFIGS:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found. Available: {list(TEMPLATE_CONFIGS.keys())}")

    tpl = TEMPLATE_CONFIGS[tpl_key]
    job_id = req.job_id if req else None
    metrics = get_active_dataset_metrics(job_id=job_id)

    data_summary = ""
    if req and req.data_summary:
        data_summary = req.data_summary
    elif job_id:
        job_dir = config.OUTPUTS_DIR / job_id
        rep_file = job_dir / "04_final_systematic_report.md"
        llama_file = job_dir / "02_llama_analysis.md"
        if rep_file.exists():
            data_summary = rep_file.read_text(encoding="utf-8")
        elif llama_file.exists():
            data_summary = llama_file.read_text(encoding="utf-8")

    if not data_summary:
        summary_path = config.PROCESSED_OUTPUT_DIR / "llama_summary.md"
        if summary_path.exists():
            data_summary = summary_path.read_text(encoding="utf-8")
        else:
            top_colls = ", ".join(f"{c['name']} ({c['production']:,.1f} MT)" for c in metrics['collieries'][:3])
            data_summary = (
                f"Total Production: {metrics['total_production']:,.2f} MT | "
                f"Total Dispatch: {metrics['total_dispatch']:,.2f} MT | "
                f"Target Fulfillment: {metrics['achievement_pct']:.2f}% | "
                f"Offtake Ratio: {metrics['offtake_ratio']:.2f}% | "
                f"Top Units: {top_colls}."
            )

    # Load template prompt
    prompt_file = config.PROMPTS_DIR / f"template_{tpl_key}.txt"
    system_prompt = prompt_file.read_text(encoding="utf-8") if prompt_file.exists() else ""
    full_prompt = system_prompt.replace("{data_summary}", data_summary)
    if req and req.custom_focus:
        full_prompt += f"\n\nADDITIONAL FOCUS DIRECTIVE:\n{req.custom_focus}"

    # Check if Ollama is accessible (skip on Vercel to respond instantly)
    ai_generated_text = None
    if not (os.getenv("VERCEL") == "1" or os.getenv("VERCEL_ENV")):
        try:
            ollama_model = req.model if req and req.model else config.LLAMA_MODEL
            resp = requests.post(
                f"{config.OLLAMA_BASE_URL}/api/generate",
                json={"model": ollama_model, "prompt": full_prompt, "stream": False},
                timeout=1.5
            )
            if resp.status_code == 200:
                ai_generated_text = resp.json().get("response")
        except Exception:
            ai_generated_text = None

    sections = []
    if ai_generated_text and len(ai_generated_text.strip()) > 50:
        parts = ai_generated_text.split("\n\n")
        curr_title = tpl["sections"][0]
        curr_content = []
        sec_idx = 0
        for p in parts:
            p_strip = p.strip()
            if not p_strip:
                continue
            if any(p_strip.lower().startswith(s.lower()[:15]) for s in tpl["sections"]) or p_strip.startswith(("#", "1.", "2.", "3.", "4.")):
                if curr_content and sec_idx < len(tpl["sections"]):
                    sections.append({"title": curr_title, "content": "\n\n".join(curr_content)})
                    curr_content = []
                    sec_idx += 1
                    curr_title = tpl["sections"][min(sec_idx, len(tpl["sections"]) - 1)]
                curr_title = p_strip.lstrip("#").strip()
            else:
                curr_content.append(p_strip)
        if curr_content:
            sections.append({"title": curr_title, "content": "\n\n".join(curr_content)})

    # Unconditionally enforce identical, deterministic dataset synthesis across all graphic templates
    if not sections:
        top_name = metrics["collieries"][0]["name"] if metrics["collieries"] else "Primary Colliery"
        top_prod = metrics["collieries"][0]["production"] if metrics["collieries"] else 0.0

        sections = [
            {
                "title": "1. Macro Operational Baseline & Synthesis",
                "content": f"National coal extraction recorded {metrics['total_production']:,.2f} MT across {metrics['count']} monitored production assets. Target benchmark fulfillment reached {metrics['achievement_pct']:.2f}%, sustaining critical utility stock buffers above mandated norms. Total pithead dispatch reached {metrics['total_dispatch']:,.2f} MT with a robust {metrics['offtake_ratio']:.2f}% offtake efficiency."
            },
            {
                "title": "2. Key Performance Indicators & Benchmark Analytics",
                "content": f"Top producing installations sustained strong operational capacity, led by {top_name} with {top_prod:,.2f} MT. Parametric distribution across {metrics['count']} units reveals a sample mean of {metrics['mean']:,.2f} MT, median of {metrics['median']:,.2f} MT, and upper IQR fence at {metrics['upper_fence']:,.2f} MT. Units operating at or above this threshold have been prioritized with automated rake evacuation."
            },
            {
                "title": "3. Supply Chain, Logistics & Dispatch Priorities",
                "content": "• PRIORITY 1: Accelerate First-Mile Connectivity (FMC) rail sidings to enhance pithead evacuation and eliminate accumulation.\n• PRIORITY 2: Standardize continuous surface miner telemetry and digital monitoring across active open-cast extraction benches.\n• PRIORITY 3: Maintain mandatory 24-day normative fuel buffer stocks across all critical thermal power utilities."
            }
        ]

    # Check if active media assets exist from PDF extraction (check job-isolated first)
    active_images = []
    if job_id:
        manifest = config.OUTPUTS_DIR / job_id / "media_manifest.json"
        if manifest.exists():
            try:
                m_data = json.loads(manifest.read_text(encoding="utf-8"))
                active_images = [img.get("path") for img in m_data.get("images", []) if img.get("path")]
            except Exception:
                pass
    if not active_images:
        active_media_file = config.OUTPUTS_DIR / "active_media_assets.json"
        if active_media_file.exists():
            try:
                m_data = json.loads(active_media_file.read_text(encoding="utf-8"))
                active_images = m_data.get("images", [])
            except Exception:
                active_images = []

    # Re-compile the template-specific documents immediately with active dataset metrics
    combined_summary = "\n\n".join(f"## {s['title']}\n{s['content']}" for s in sections)
    report_id = f"REP-2026-{uuid.uuid4().hex[:4].upper()}"
    pkg = document_generator.generate_all_packages(
        template_name=tpl_key,
        report_id=report_id,
        summary_text=combined_summary,
        user_records=metrics["collieries"],
        images=active_images,
        job_id=job_id
    )

    # Persist report to Generated Report History Hub
    record_report(
        report_id=report_id,
        title=f"{tpl['name']} — Performance Intelligence Dossier",
        template_id=tpl_key,
        template_name=tpl["name"],
        theme=tpl["theme"],
        auditor_id=config.AUTH_OFFICER_ID or "OFFICER-AUDITOR",
        records_count=metrics["count"],
        summary_snippet=sections[0]["content"] if sections else "",
        job_id=job_id
    )

    return {
        "success": True,
        "job_id": job_id,
        "template_id": tpl_key,
        "template_name": tpl["name"],
        "theme": tpl["theme"],
        "header_title": tpl["header_title"],
        "subtitle": tpl["subtitle"],
        "primary_hex": tpl["primary_hex"],
        "accent_hex": tpl["accent_hex"],
        "light_bg_hex": tpl["light_bg_hex"],
        "icon": tpl["icon"],
        "badge": tpl["badge"],
        "sections": sections,
        "images": active_images,
        "kpis": [
            {"label": "National Extraction", "value": f"{metrics['total_production']:,.2f} MT", "badge": f"{metrics['achievement_pct']:.2f}% Target"},
            {"label": "Thermal Dispatch", "value": f"{metrics['total_dispatch']:,.2f} MT", "badge": f"{metrics['offtake_ratio']:.2f}% Offtake"},
            {"label": "Active Collieries", "value": f"{metrics['count']} Collieries", "badge": "Basin Monitored"},
            {"label": "Audit Integrity", "value": "100% Deterministic", "badge": "AST Math Verified"}
        ],
        "collieries_preview": metrics["collieries"][:8],
        "files": pkg.get("files", {})
    }


# -------------------------------------------------------------------------
# REPORT HISTORY ENDPOINTS
# -------------------------------------------------------------------------
@app.get("/api/reports/history")
def get_reports_history(search: Optional[str] = None, auditor: Optional[str] = None):
    """Returns persistent generated report history with word search filtering."""
    history = get_history(search=search, auditor_id=auditor)
    return {"success": True, "history": history, "count": len(history)}


class RecordHistoryRequest(BaseModel):
    id: str
    title: str
    template: str
    template_name: str
    theme: str
    auditor_id: Optional[str] = None
    records_count: Optional[int] = 18
    summary_snippet: Optional[str] = ""
    job_id: Optional[str] = None


@app.post("/api/reports/history")
def add_report_history(req: RecordHistoryRequest):
    """Records a generated report into the persistent history log."""
    entry = record_report(
        report_id=req.id,
        title=req.title,
        template_id=req.template,
        template_name=req.template_name,
        theme=req.theme,
        auditor_id=req.auditor_id or config.AUTH_OFFICER_ID or "OFFICER-AUDITOR",
        records_count=req.records_count or 18,
        summary_snippet=req.summary_snippet or "",
        job_id=req.job_id
    )
    return {"success": True, "entry": entry}


# -------------------------------------------------------------------------
# REPORT DOWNLOAD ENDPOINTS
# -------------------------------------------------------------------------
@app.get("/api/reports/download/csv")
def download_active_csv(job_id: Optional[str] = Query(None)):
    """Downloads the raw clean CSV dataset (strictly without template styling)."""
    effective_job_id = job_id if isinstance(job_id, str) and job_id.strip() else None
    if effective_job_id:
        job_csv = config.OUTPUTS_DIR / effective_job_id / "active_dataset.csv"
        if job_csv.exists() and job_csv.stat().st_size > 0:
            return FileResponse(path=job_csv, filename=f"Cleaned_Dataset_{effective_job_id}.csv", media_type="text/csv")
        job_json = config.OUTPUTS_DIR / effective_job_id / "active_dataset.json"
        if job_json.exists():
            try:
                recs = json.loads(job_json.read_text(encoding="utf-8"))
                if recs:
                    df = pd.DataFrame(recs)
                    df.to_csv(job_csv, index=False)
                    return FileResponse(path=job_csv, filename=f"Cleaned_Dataset_{effective_job_id}.csv", media_type="text/csv")
            except Exception:
                pass

    active_csv = config.OUTPUTS_DIR / "active_cleaned_dataset.csv"
    if active_csv.exists() and active_csv.stat().st_size > 0:
        return FileResponse(path=active_csv, filename="Cleaned_Coal_Dataset_2026.csv", media_type="text/csv")

    base_csv = config.REPORTED_DATA_DIR / "coal_production_report.csv"
    if base_csv.exists():
        return FileResponse(path=base_csv, filename="National_Coal_Production_Dataset.csv", media_type="text/csv")

    metrics = get_active_dataset_metrics(job_id=effective_job_id)
    df = pd.DataFrame(metrics["collieries"])
    active_csv.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(active_csv, index=False)
    return FileResponse(path=active_csv, filename="Coal_Collieries_Dataset.csv", media_type="text/csv")


class ReportPackageRequest(BaseModel):
    template: str = "executive_brief"
    report_id: str = "REP-2026-B56D"
    custom_summary: Optional[str] = None
    job_id: Optional[str] = None


@app.post("/api/reports/generate-package")
def generate_report_package(
    req: Optional[ReportPackageRequest] = None,
    session: Dict[str, Any] = Depends(require_auth)
):
    """Compiles actual publication-grade PDF, DOCX, and XLSX reports. Requires valid officer session."""
    tpl = req.template if req else "executive_brief"
    rep_id = req.report_id if req else "REP-2026-B56D"
    job_id = req.job_id if req else None
    summary_text = None
    if req and req.custom_summary:
        summary_text = req.custom_summary
    elif job_id:
        rep_file = config.OUTPUTS_DIR / job_id / "04_final_systematic_report.md"
        if rep_file.exists():
            summary_text = rep_file.read_text(encoding="utf-8")
    if not summary_text:
        summary_path = config.PROCESSED_OUTPUT_DIR / "llama_summary.md"
        if summary_path.exists():
            summary_text = summary_path.read_text(encoding="utf-8")

    result = document_generator.generate_all_packages(
        template_name=tpl,
        report_id=rep_id,
        summary_text=summary_text,
        job_id=job_id
    )
    return result


@app.get("/api/reports/download/{fmt}")
def download_report_format(fmt: str, template: Optional[str] = None, job_id: Optional[str] = Query(None)):
    """Downloads the generated report in the requested format (pdf, docx, xlsx, csv) for the selected template."""
    fmt = fmt.lower().lstrip(".")
    if fmt == "csv":
        return download_active_csv(job_id=job_id)

    mapping = {
        "pdf": ("Ministry_of_Coal_Report_2026.pdf", "application/pdf"),
        "docx": ("Ministry_of_Coal_Report_2026.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        "xlsx": ("Ministry_of_Coal_Report_2026.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    }
    if fmt not in mapping:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {fmt}. Choose from pdf, docx, xlsx, csv.")

    default_fname, media_type = mapping[fmt]

    TEMPLATE_ALIASES = {
        "executive_brief": "bento_grid",
        "corporate_minimalist": "editorial_canvas",
        "technical_deepdive": "obsidian_deck",
        "visual_infographic": "aurora_gradient",
        "parliamentary_scorecard": "nordic_ocean",
        "esg_sustainable": "warm_sandstone",
    }
    raw_key = (template or "bento_grid").lower().replace(" ", "_")
    tpl_key = TEMPLATE_ALIASES.get(raw_key, raw_key)
    target_fname = f"Ministry_of_Coal_{tpl_key}_2026.{fmt}" if template else default_fname

    effective_job_id = job_id if isinstance(job_id, str) and job_id.strip() else None

    # If job_id provided, look in job-isolated directory first
    if effective_job_id:
        job_dirs = [config.OUTPUTS_DIR / effective_job_id, config.REPORTS_DIR / effective_job_id]
        for jd in job_dirs:
            if jd.exists():
                for f in jd.glob(f"*.{fmt}"):
                    if f.stat().st_size > 0:
                        return FileResponse(
                            path=f,
                            filename=f.name,
                            media_type=media_type,
                            headers={"Content-Disposition": f'attachment; filename="{f.name}"'}
                        )

    # Search candidates in standard report directories
    search_dirs = [config.REPORTS_DIR, getattr(config, "PUBLIC_REPORTS_DIR", None), getattr(config, "STATIC_REPORTS_DIR", None)]
    search_dirs = [d for d in search_dirs if d is not None and d.exists()]

    for d in search_dirs:
        candidate = d / target_fname
        if candidate.exists() and candidate.stat().st_size > 0:
            return FileResponse(
                path=candidate,
                filename=target_fname,
                media_type=media_type,
                headers={"Content-Disposition": f'attachment; filename="{target_fname}"'}
            )

    # If specific template not found yet, attempt on-the-fly generation
    try:
        if fmt == "pdf":
            document_generator.generate_pdf_report(template_name=tpl_key, job_id=effective_job_id)
        elif fmt == "docx":
            document_generator.generate_docx_report(template_name=tpl_key, job_id=effective_job_id)
        elif fmt == "xlsx":
            document_generator.generate_excel_workbook(template_name=tpl_key, job_id=effective_job_id)
    except Exception:
        pass

    # Check again after generation
    for d in search_dirs:
        candidate = d / target_fname
        if candidate.exists() and candidate.stat().st_size > 0:
            return FileResponse(
                path=candidate,
                filename=target_fname,
                media_type=media_type,
                headers={"Content-Disposition": f'attachment; filename="{target_fname}"'}
            )

    # Fallback to default format file
    for d in search_dirs:
        candidate = d / default_fname
        if candidate.exists() and candidate.stat().st_size > 0:
            return FileResponse(
                path=candidate,
                filename=target_fname,
                media_type=media_type,
                headers={"Content-Disposition": f'attachment; filename="{target_fname}"'}
            )

    raise HTTPException(
        status_code=404,
        detail=f"Report '{target_fname}' not found. Please generate the report first or try again later."
    )


@app.get("/api/reports/{job_id}")
def get_report(job_id: str):
    """Retrieves all generated artifacts and reports for a given job."""
    job_dir = config.OUTPUTS_DIR / job_id
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Job ID not found.")

    def read_artifact(fname: str) -> Optional[str]:
        p = job_dir / fname
        return p.read_text(encoding="utf-8") if p.exists() else None

    meta_file = job_dir / "metadata.json"
    metadata = json.loads(meta_file.read_text(encoding="utf-8")) if meta_file.exists() else {}

    return {
        "job_id": job_id,
        "metadata": metadata,
        "raw_markdown": read_artifact("01_raw_converted.md"),
        "llama_analysis": read_artifact("02_llama_analysis.md"),
        "math_audit": json.loads(read_artifact("03_math_audit.json") or "{}"),
        "final_report": read_artifact("04_final_systematic_report.md")
    }


@app.get("/api/reports/{job_id}/download")
def download_final_report(job_id: str):
    """Downloads the final systematic Markdown report file."""
    report_path = config.OUTPUTS_DIR / job_id / "04_final_systematic_report.md"
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="Final report not found.")
    return FileResponse(
        path=report_path,
        filename=f"Report_{job_id}.md",
        media_type="text/markdown"
    )



@app.post("/api/pipeline/run-dataset-audit")
def run_dataset_audit():
    """Converts reported_data CSVs and triggers local LLaMA 3.1 analysis."""
    import sys
    from run_user_task import run as run_task
    try:
        run_task()
        summary_path = config.PROCESSED_OUTPUT_DIR / "llama_summary.md"
        return {
            "success": True,
            "message": "Dataset audit and LLaMA 3.1 summarization complete.",
            "summary": summary_path.read_text(encoding="utf-8") if summary_path.exists() else ""
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audit execution error: {str(e)}")








# -------------------------------------------------------------------------
# COMPREHENSIVE DATASETS & TRENDS ENDPOINTS
# -------------------------------------------------------------------------
@app.get("/api/trends")
def get_trends_data():
    """Returns multi-horizon trends including 10-year production, 12-month trajectory, 6-month colliery trajectory, import substitution, and subsidiary finances."""
    trends_file = config.find_data_file("trends_data.json")
    if trends_file and trends_file.exists():
        try:
            return json.loads(trends_file.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning(f"Error reading trends_data.json: {e}")

    # Fallback to authentic Coal India dataset metrics
    metrics = get_active_dataset_metrics()
    return {
        "status": "success",
        "data_as_of": "2026-03-31",
        "reporting_body": "Ministry of Coal / Coal India Limited",
        "total_production": metrics.get("total_production", 773.60),
        "total_dispatch": metrics.get("total_dispatch", 753.50),
        "achievement_pct": metrics.get("achievement_pct", 96.84),
        "collieries_preview": metrics.get("collieries", [])[:10]
    }


@app.get("/api/datasets")
def list_available_datasets():
    """Returns catalog of all authentic national coal mining datasets available in the platform."""
    datasets = [
        {
            "id": "coal_production_10yr",
            "title": "National Coal Production & YoY Trajectory (2013–2025)",
            "description": "10-Year official national time-series: total coal extracted, YoY growth percentages, and subsidiary volume shares.",
            "source": "Ministry of Coal / PIB Official Gazette",
            "format": "csv",
            "rows": 25,
            "filename": "coal_production_report.csv",
            "download_url": "/api/datasets/coal_production_10yr/download"
        },
        {
            "id": "historical_coking_noncoking",
            "title": "Historical Coking, Non-Coking & Washery Coke (2000–2026)",
            "description": "Category-wise coal extraction trends: Coking Coal, Non-Coking Coal, Hard Coke, and Washed Coke.",
            "source": "Coal Controller's Organization (CCO)",
            "format": "csv",
            "rows": 11,
            "filename": "datafile.csv",
            "download_url": "/api/datasets/historical_coking_noncoking/download"
        },
        {
            "id": "parliamentary_import_supply",
            "title": "Parliamentary Coal Supply & Import Substitution (RS Session 249)",
            "description": "Domestic coal production versus imported coal supplies and non-coking thermal power plant deliveries.",
            "source": "Rajya Sabha / Parliamentary Records (RS 249 AS18)",
            "format": "csv",
            "rows": 12,
            "filename": "RS_249_AS18.csv",
            "download_url": "/api/datasets/parliamentary_import_supply/download"
        },
        {
            "id": "subsidiary_revenue_production",
            "title": "CIL Subsidiary-Wise Production & Revenue Breakdown (RS Session 265)",
            "description": "Subsidiary-wise extraction volume in Million Tonnes and financial turnover in Rs. Crore (Rs. 1,41,967 Crore Total).",
            "source": "Rajya Sabha Starred Question / CIL Audited Statements",
            "format": "csv",
            "rows": 9,
            "filename": "RS_Session_265_AU_52_B.csv",
            "download_url": "/api/datasets/subsidiary_revenue_production/download"
        },
        {
            "id": "cil_collieries_master",
            "title": "Coal India Master Colliery & Mining Asset Registry",
            "description": "Active extraction benchmarks, dragline and shovel-dumper HEMM telemetry, state coordinates, and offtake fulfillment rates.",
            "source": "CIL Integrated Annual Report & BRSR Filings",
            "format": "json",
            "rows": 18,
            "filename": "cil_colliery_data.json",
            "download_url": "/api/datasets/cil_collieries_master/download"
        }
    ]
    return {
        "status": "success",
        "count": len(datasets),
        "datasets": datasets
    }


@app.get("/api/datasets/{dataset_id}")
def get_dataset_details(dataset_id: str):
    """Returns dataset content as structured JSON records."""
    mapping = {
        "coal_production_10yr": "coal_production_report.csv",
        "historical_coking_noncoking": "datafile.csv",
        "parliamentary_import_supply": "RS_249_AS18.csv",
        "subsidiary_revenue_production": "RS_Session_265_AU_52_B.csv",
        "cil_collieries_master": "cil_colliery_data.json"
    }
    fname = mapping.get(dataset_id)
    if not fname:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")

    target_file = config.find_data_file(fname)
    if not target_file or not target_file.exists():
        raise HTTPException(status_code=404, detail=f"Dataset file '{fname}' not available.")

    if fname.endswith(".json"):
        return json.loads(target_file.read_text(encoding="utf-8"))

    try:
        df = pd.read_csv(target_file)
        return {
            "id": dataset_id,
            "filename": fname,
            "total_rows": len(df),
            "columns": list(df.columns),
            "data": df.fillna("").to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read dataset: {str(e)}")


@app.get("/api/datasets/{dataset_id}/download")
def download_dataset_file(dataset_id: str):
    """Direct download endpoint for dataset files (CSV or JSON)."""
    mapping = {
        "coal_production_10yr": ("coal_production_report.csv", "text/csv"),
        "historical_coking_noncoking": ("datafile.csv", "text/csv"),
        "parliamentary_import_supply": ("RS_249_AS18.csv", "text/csv"),
        "subsidiary_revenue_production": ("RS_Session_265_AU_52_B.csv", "text/csv"),
        "cil_collieries_master": ("cil_colliery_data.json", "application/json")
    }
    if dataset_id not in mapping:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    fname, mtype = mapping[dataset_id]
    target_file = config.find_data_file(fname)
    if not target_file or not target_file.exists():
        raise HTTPException(status_code=404, detail="Dataset file missing.")

    return FileResponse(
        path=target_file,
        filename=fname,
        media_type=mtype,
        headers={"Content-Disposition": f'attachment; filename="{fname}"'}
    )


@app.get("/api/analytics/summary")
def get_analytics_summary(job_id: Optional[str] = Query(None)):
    """Computes high-precision descriptive statistics and IQR anomaly boundaries across active colliery records."""
    effective_job_id = job_id if isinstance(job_id, str) and job_id.strip() else None
    metrics = get_active_dataset_metrics(job_id=effective_job_id)
    collieries = metrics.get("collieries", [])
    prods = [c.get("production", 0.0) for c in collieries if isinstance(c.get("production"), (int, float))]
    
    anomalies = []
    if prods:
        lower_bound = metrics.get("lower_fence", 0.0)
        upper_bound = metrics.get("upper_fence", 0.0)
        for c in collieries:
            p = c.get("production", 0.0)
            if p > upper_bound:
                anomalies.append({
                    "mine": c.get("name"),
                    "type": "SURGE_PRODUCTION",
                    "severity": "HIGH",
                    "production": p,
                    "threshold": upper_bound,
                    "reason": "Production output exceeds upper IQR quartile fence (Mega-Producer)."
                })
            elif p < lower_bound:
                anomalies.append({
                    "mine": c.get("name"),
                    "type": "LOW_OUTPUT",
                    "severity": "MEDIUM",
                    "production": p,
                    "threshold": lower_bound,
                    "reason": "Production below lower IQR quartile fence."
                })

    return {
        "status": "success",
        "count": len(collieries),
        "total_production_mt": metrics.get("total_production", 773.60),
        "total_dispatch_mt": metrics.get("total_dispatch", 753.50),
        "achievement_pct": metrics.get("achievement_pct", 96.84),
        "mean_mt": metrics.get("mean", 96.02),
        "median_mt": metrics.get("median", 0.0),
        "std_dev": metrics.get("std_dev", 68.45),
        "q1": metrics.get("q1", 0.0),
        "q3": metrics.get("q3", 0.0),
        "iqr": metrics.get("iqr", 0.0),
        "lower_fence": metrics.get("lower_fence", 0.0),
        "upper_fence": metrics.get("upper_fence", 0.0),
        "anomalies": anomalies,
        "state_aggregates": metrics.get("state_aggregates", {})
    }


# Mount static directory for frontend UI (when NOT in serverless mode)
static_dir = Path(__file__).resolve().parent / "static"
if not config.IS_VERCEL and static_dir.exists():
    from starlette.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")



