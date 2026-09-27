# 🏛️ MineIntel: Autonomous Enterprise Document Intelligence & Regulatory Dossier Engine
### **Smart India Hackathon (SIH 2026) | Problem Statement: Automated Document Intelligence and Reporting**

> **An enterprise-grade, deterministic document intelligence platform that transforms raw, uncurated operational telemetry into publication-grade, mathematically verified corporate dossiers with zero hallucinations and zero cloud data leakage.**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Ollama](https://img.shields.io/badge/AI%20Inference-Local%20Ollama%20%28Qwen%202.5%207B%29-white.svg?logo=ollama&logoColor=black)](https://ollama.com)
[![Security](https://img.shields.io/badge/Security-Local--First%20%7C%20Zero%20Data%20Egress-green.svg)](https://github.com)
[![License](https://img.shields.io/badge/License-Proprietary%20%2F%20SIH%202026-blue.svg)](https://github.com)

---

## ⚡ The Problem vs. The Solution

### Why "Chat-Style AI" Fails for Regulatory Governance
Conventional Large Language Model wrappers and conversational chat interfaces fail catastrophically in enterprise and governmental environments:
- ❌ **Stochastic Hallucination:** Generative models invent numbers, colliery metrics, and operational dates when presented with dense tabular data.
- ❌ **Arithmetic Incompetence:** Autoregressive language models cannot reliably calculate rolling averages, percentage shares, or compound growth rates.
- ❌ **Context Window Thrashing & Amnesia:** Ingesting 200+ page technical manuals causes context degradation, omitting critical compliance violations.
- ❌ **Sovereignty & Privacy Breaches:** Transmitting critical national infrastructure data, dispatch volumes, or financial ledgers to third-party public cloud APIs compromises data sovereignty.
- ❌ **Non-Auditable Output:** Conversational assistants produce narrative prose without exact provenance, making post-audit verification impossible.

### The MineIntel Solution: Deterministic Agent Architecture
MineIntel completely replaces unpredictable conversational loops with a **10-Stage Code-Governed Deterministic State Machine**. In this architecture:
- **Code governs workflow trajectory:** Execution flow, stage transitions, timeouts, and state persistence are strictly orchestrated by programmatic logic.
- **AI provides bounded semantic reasoning:** Local, sovereign LLMs (`qwen2.5:7b`) are invoked strictly for semantic extraction and professional executive synthesis, constrained by immutable database evidence items.
- **AST Mathematical Engine audits calculations:** All aggregations, fences, and totals are pre-calculated via Python Abstract Syntax Tree (AST) math engines prior to narrative generation.
- **Universal Traceability:** Every factual statement cites an immutable evidence ID (`[EVD-FACT-...]`, `[EVD-CALC-...]`), establishing an unbreakable provenance chain back to the raw source file.

---

## 🏛️ Core Technical Pillars

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      MINEINTEL CORE ARCHITECTURE                       │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
     ┌───────────────────────────────┼───────────────────────────────┐
     │                               │                               │
     ▼                               ▼                               ▼
┌──────────────┐            ┌──────────────────┐            ┌─────────────────┐
│ PERSISTENCE  │            │   PERFORMANCE    │            │    PRECISION    │
│ SQLite / WAL │            │ Bounded Asyncio  │            │ Deterministic   │
│ Evidence DB  │            │ Concurrency Loop │            │ Evidence Proof  │
└──────────────┘            └──────────────────┘            └─────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │   PRESENTATION   │
                            │ Corporate Dossier│
                            │ 300-DPI PDF/DOCX │
                            └──────────────────┘
```

### 1. 🗄️ Persistence: SQLite-Backed Evidence Repository
- **Atomic Evidence Storage:** Raw files (CSV, XLSX, PDF, TXT) are shredded into immutable atomic evidence records stored in a Write-Ahead Logging (WAL) SQLite repository (with optional enterprise Neon PostgreSQL support).
- **Cryptographic Provenance:** Every evidence item records source filename, file SHA-256 hash, byte offsets, table coordinates, and extraction timestamps.
- **UUID Directory Isolation:** Every workflow run is assigned a cryptographically random `uuid.uuid4()` identifier, isolating all intermediate markdown artifacts, chart renders, and final dossiers in dedicated sandboxed directories (`outputs/{job_id}/`).

### 2. ⚡ Performance: Asyncio Parallel Synthesis
- **Non-Blocking Orchestration:** The synthesis engine wraps CPU-bound and synchronous Ollama inference in `asyncio.to_thread` workers, allowing high-throughput concurrent section drafting.
- **Semaphore-Governed Queue Control:** Concurrency is bounded to prevent local GPU/CPU hardware thrashing while maintaining a strict 120-second per-section execution budget.
- **Dynamic Heartbeat & Watchdogs:** Real-time state machine tracks active and completed sections with sub-second heartbeats, completely eliminating hung states or thread starvation.

### 3. 🎯 Precision: Zero-Hallucination Grounding
- **Mandatory Citation Anchoring:** Prompts dynamically inject verified database evidence items and chunk summaries into Qwen's attention context. The model is forbidden from introducing outside figures.
- **Deterministic Math Engine:** Aggregations (sums, averages, IQR outlier fences, dispatch ratios) are computed programmatically and injected as verified facts.
- **Stage 8 Data Integrity Gate:** Before report compilation, an automated validation gate inspects all planned sections. Any empty content or missing evidence citations halts progression immediately with deterministic error codes.

### 4. 📊 Presentation: Publication-Grade Corporate Dossier
- **Dual-Pass Canvas Compilation:** Leverages ReportLab's `NumberedReportCanvas` to pre-calculate total document pages, rendering authoritative `"Page X of Y"` footers, dynamic running headers, and security classifications.
- **Executive Aesthetic Palette:** Styled with a bespoke Deep Navy (`#002147`), Slate Grey (`#708090`), and Accent Gold (`#D4AF37`) corporate design system.
- **Multi-Format Parity:** Produces simultaneous pixel-perfect PDF dossiers, editable Microsoft Word (`.docx`) files, structured data tables, and GitHub-flavored Markdown.

---

## 💻 Tech Stack

| Layer | Technologies | Purpose & Architecture Highlights |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Lucide Icons | Reactive single-page executive workstation; features 60 FPS live processing funnels, interactive document previewers, and split-pane report editor. |
| **Backend** | Python 3.10+, FastAPI, Pydantic v2, SQLAlchemy, Uvicorn | Asynchronous high-performance REST API with dependency injection, strict schema validation, and structured error handling. |
| **Deterministic AI** | Ollama, Qwen 2.5 7B (`qwen2.5:7b`) | 100% on-premises, local-first neural reasoning engine; zero telemetry transmission, zero external API keys required. |
| **Data & Persistence** | SQLite 3 (WAL Mode), SQLAlchemy ORM | ACID-compliant transactional persistence for task states, user sessions, evidence records, and versioned report revisions. |
| **Document Engine** | ReportLab 4.x, python-docx, openpyxl, Matplotlib | High-DPI Flowable PDF rendering engine with custom coordinate canvases, Word styling pipelines, and vector charts. |
| **Security** | PyJWT, Passlib (Bcrypt), Cryptographic Nonces | Sovereign JWT authentication, cryptographically signed session cookies, dynamic SVG captcha verification, and role-based access control. |

---

## 🔄 The End-to-End Workflow

```
[ Upload ] ───► [ Ingest & Shred ] ───► [ Autonomous Coordinator ] ───► [ Executive Review ] ───► [ Export ]
  Raw Files       • Schema Detect        • Chunk Summarization             • Version Diff           • 300 DPI PDF
  (CSV/XLSX/PDF)  • AST Math Audit       • Chart Synthesis                 • Section Polish         • Word DOCX
                  • SQLite Storage       • Parallel Qwen Drafting          • Audit Provenance       • Markdown
```

1. **Upload:** User uploads uncurated colliery spreadsheets, atmospheric safety logs, or operational PDFs through the drag-and-drop workspace.
2. **Ingest & Shred:** The unified ingestion engine normalizes tabular structures, extracts cell-level coordinates, executes AST mathematical validation, and writes immutable records to the SQLite evidence store.
3. **Autonomous Coordinator:** The `AgentCoordinator` advances through 10 deterministic stages:
   - `LOAD_MANIFEST` $\rightarrow$ `VERIFY_INGESTION` $\rightarrow$ `EVIDENCE_ANALYSIS`
   - `INTELLIGENCE_ANALYSIS` (Chronology, Conflicts, Topic Clustering)
   - `CHART_ANALYSIS` (Statistical detection & Matplotlib rendering)
   - `PLANNING` & `VALIDATE_PLAN` (Dynamic topic-driven outline generation)
   - `WRITING` (Semaphore-bounded parallel synthesis via local Qwen 2.5)
   - `VALIDATE_REPORT_DATA` (Integrity & factual citation audit gate)
   - `COMPILE_MARKDOWN_ARTIFACT` & `VERIFY_ARTIFACT`
4. **Executive Review:** Users inspect the generated dossier in the split-view Report Editor, modify section narratives, review evidence citations, or restore historical revisions.
5. **Export:** Generates board-ready Corporate Dossier PDFs with dedicated cover pages, confidential watermarks, and synchronized DOCX documents.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ (tested up to Python 3.14 on Linux/macOS/Windows)
- Node.js 18+ and `npm`
- [Ollama](https://ollama.com) installed and running locally

### 1. AI Engine Setup (Local Ollama)
```bash
# Start Ollama service
ollama serve

# In a separate terminal, pull the recommended 7B parameter reasoning model
ollama pull qwen2.5:7b
```

### 2. Backend Setup (FastAPI)
```bash
# Navigate to project root
cd SIH_ps_2_test_1

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install required production dependencies
pip install -r requirements.txt

# Start the FastAPI backend server
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup (React & Vite)
```bash
# Open a new terminal in the project root
npm install

# Start the local development server
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser to access the MineIntel Executive Workstation.

---

## 🔒 Security & Data Sovereignty

- 🛡️ **Zero Cloud Leakage:** In accordance with governmental compliance standards, all AI processing runs strictly inside your local execution environment via local Ollama. No data ever leaves the sovereign perimeter.
- 🔑 **Cryptographic Authentication:** Full JWT-based bearer token authentication with secure HTTP-only cookies, password salted hashing via bcrypt, and strict officer session isolation.
- 🧩 **Brute-Force & Bot Defense:** Built-in dynamic SVG captcha challenge engine with cryptographic noise, bezier curve interference, and timed nonce verification.
- 🧹 **Air-Gapped Operation:** Designed to operate in completely isolated, air-gapped intranet deployments across regional colliery headquarters and ministerial data centers.

---

## 👥 Authors & Recognition
- **Team:** MineIntel Engineering Group
- **Event:** Smart India Hackathon (SIH 2026)
- **Ministry:** Ministry of Coal, Government of India
- **Problem Statement:** AI Document Intelligence & Automated Systematic Reporting
