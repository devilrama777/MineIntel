# ⛏️ SIH Mining — Ministry of Coal Web Application & Dashboard

> **Smart India Hackathon (SIH) • Problem Statement: Automated Coal & Mining Report Generation & Analytics Platform**

An enterprise-grade, high-performance web application featuring **Secure Enclave Authentication**, **Executive KPI Scorecards**, **Automated Dataset Validation (0–100% Quality Gauge)**, **Statistical Anomaly Filtering (IQR & Z-Score)**, and **Multi-Format Report Exporting (PDF / Word / Excel)**.

---

## 🌟 Key Features

1. **🔐 Government Secure Enclave Login:**
   - Official Ministry of Coal styling & design tokens.
   - Employee ID & Credential verification.
   - Password reveal toggle & persistent session management.
   - Offline-first fallback inference mode.

2. **📊 Executive Overview & KPI Scorecard:**
   - Real-time aggregate tracking for **Total Production (MT)**, **Total Dispatch (MT)**, **Target Achievement (%)**, and **Active Mines**.
   - Colliery performance leaderboard with production share metrics.

3. **📁 Dataset Ingestion & Quality Audit Engine:**
   - Supports CSV, XLSX, and XLS mining datasets.
   - Automated schema validation, column type normalization, and 0–100% Quality Score Gauge.

4. **⚡ High-Speed Analytics & Anomaly Detection:**
   - Descriptive statistics (Mean, Median, Std Dev, Quartiles Q1/Q3).
   - IQR (Interquartile Range) outlier flagging for operational anomalies.

5. **📄 Multi-Format Report Generation Studio:**
   - Template selection: *Monthly Production & Dispatch*, *Mine Performance Diagnostic*, *Executive Briefing*.
   - Generates and downloads **ReportLab 300 DPI PDF**, **Word DOCX**, and **7-sheet Excel Workbooks**.

6. **⚙️ Subsystem Diagnostics:**
   - Live health monitoring of Python service layer, computational engine, and database connections.

---

## 🚀 Quick Start

### Option 1: Standalone Web App (Static / GitHub Pages / Any Browser)
Simply double click `index.html` or run a local static server:
```bash
# Using Python built-in HTTP server
python -m http.server 8080
```
Open **[http://localhost:8080](http://localhost:8080)** in any browser.

---

### Option 2: Full-Stack Web App with FastAPI Backend
```bash
# 1. Install dependencies
cd server
pip install -r requirements.txt

# 2. Start the API server
python main.py
```
Open **[http://localhost:8000](http://localhost:8000)** for the Web Application and **[http://localhost:8000/docs](http://localhost:8000/docs)** for Interactive Swagger API docs.

---

## 🔐 Default Login Credentials

| Credential | Value |
|---|---|
| **Officer ID** | Supplied via `MINEINTEL_OFFICER_ID` |
| **Password** | Supplied via `MINEINTEL_AUTH_PASSWORD` |
| **Security Enclave** | `v2.4.0 (Local Secure Enclave)` |

---

## 📁 Repository Structure

```
SIH-Mining/
├── index.html           # Main SPA Web Application (Login + Dashboard + Reports)
├── css/
│   └── style.css        # Custom styles, transitions & animations
├── js/
│   ├── auth.js          # Authentication state & session handler
│   ├── analytics.js     # Statistical calculations & anomaly detection
│   ├── data.js          # Pre-loaded mining datasets & sample data
│   └── app.js           # UI Controller, tab router & API client
├── server/
│   ├── main.py          # FastAPI REST backend & document endpoints
│   └── requirements.txt # Backend Python dependencies
├── start.bat            # 1-Click launcher script for Windows
├── .gitignore           # Git ignore file
└── README.md            # Project documentation
```

---

*Built for Smart India Hackathon (SIH) • Ministry of Coal Automated Report Platform*
