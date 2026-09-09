# Ministry of Coal — AI Document Intelligence & Systematic Reporting Platform
### Smart India Hackathon (SIH 2026) — Problem Statement 26023

An enterprise-grade document intelligence, reasoning, and reporting system built for the Ministry of Coal. The platform ingests uncurated tabular colliery datasets (CSV, TSV, Excel, PDF), profiles metrics, eliminates noise, executes deterministic mathematical audits, and synthesizes executive intelligence reports with automated 300 DPI PDF, Word DOCX, and multi-sheet Excel exports.

---

## 🌟 Key Architecture & Capabilities

1. **Document Ingestion & Profiling:**
   - Multi-format ingestion supporting CSV, TSV, Excel (`.xlsx`, `.xls`), and PDF tabular data.
   - Real-time client-side table preview with NaN/Inf sanitization.

2. **Sequential Intelligence Pipeline:**
   - **Data Extraction & Conversion:** Profiling unstructured and structured inputs into structured Markdown.
   - **LLaMA 3.1 Reasoning & Noise Reduction:** Filters non-actionable operational noise, dates/times, and extracts salient production telemetry.
   - **Deterministic Mathematical Engine:** AST-based verification of totals, percentages, growth trajectories, and subsidiary allocations.
   - **Gemma Executive Synthesis:** Generates formal, audit-compliant systematic executive summaries.
   - **Automated Multi-Format Document Compilation:** Generates 300 DPI ReportLab PDF, styled Microsoft Word (`.docx`), and 7-sheet formula-driven Excel (`.xlsx`) workbooks.

3. **Executive Dashboard & Interactive Visualization:**
   - Animated 12-Month Coal Production Trajectory (Target vs. Actual).
   - Subsidiary Market Share Distribution (SECL, MCL, NCL, CCL, WCL, BCCL, ECL).
   - Real-time Colliery Telemetry Marquee Feed.
   - Top Colliery Performance Leaderboard with automated achievement badges.
   - Engaging processing hub with dual-orbital radar scanner and 60 FPS live waveform during data ingestion.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+ (tested with Python 3.14)
- [Ollama](https://ollama.com) installed and serving locally (`ollama serve`)
  - Pull required models: `ollama pull llama3.1` and `ollama pull gemma4`

### Installation
```bash
# Clone the repository
git clone https://github.com/devilrama777/SIH_ps_2_test_1.git
cd SIH_ps_2_test_1

# Install dependencies
pip install fastapi uvicorn pandas numpy reportlab python-docx openpyxl requests pydantic
```

### Launch the Application
```bash
# Configure Sovereign Authentication (Required in Production)
export MINEINTEL_OFFICER_ID="MOC-OFFICER-DEMO"
export MINEINTEL_AUTH_PASSWORD="YourSecurePasswordHere"
export MINEINTEL_JWT_SECRET="YourCryptographicSecretHere"

# Start the FastAPI server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

**Authentication Setup:**
- Credentials are strictly supplied via environment variables (`MINEINTEL_OFFICER_ID`, `MINEINTEL_AUTH_PASSWORD`).
- In development/demo mode without env vars set, authentication uses generated local-session tokens or requires explicit environment configuration. Hardcoded production credentials are prohibited.

---

## 📂 Project Structure

```
├── backend/
│   ├── main.py                  # FastAPI REST API & route controller
│   ├── config.py                # System directory paths & environment setup
│   ├── services/
│   │   ├── converter.py         # Tabular data profiling to Markdown
│   │   ├── llama_client.py      # LLaMA 3.1 local inference client
│   │   ├── math_engine.py       # Deterministic AST mathematical verification
│   │   ├── gemma_client.py      # Systematic report synthesis via Gemma
│   │   ├── document_generator.py# ReportLab 300 DPI PDF, Word DOCX & Excel generator
│   │   └── pipeline.py          # Sequential multi-stage orchestrator
│   └── static/                  # Executive Dashboard SPA (HTML5, Tailwind, Chart.js, Vanilla CSS)
├── default_data_backup/         # Benchmark colliery data and sample datasets
├── run_user_task.py             # CLI pipeline invocation script
└── README.md
```

---

## 🔒 Security & Privacy
- **100% Local Inference:** AI processing runs entirely on-premise through local Ollama instances without external API data transmission.
- **Zero Cloud Leakage:** Sensitive colliery dispatch data and financial statistics remain within the sovereign boundary.
