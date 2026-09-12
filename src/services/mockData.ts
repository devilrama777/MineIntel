import {
  DataSourceItem,
  ProcessingJobItem,
  EvidenceItem,
  ReportItem,
  ReportSectionNode,
  EditorBlock,
  AssetRecord,
  ValidationIssueItem,
  AuditLogItem,
  SystemHealthComponent,
  SystemSecurityPosture,
} from '../types';

export const INITIAL_SECURITY_POSTURE: SystemSecurityPosture = {
  localAiStatus: 'Ready (Local Loopback / Managed Sidecar)',
  externalAiStatus: 'Strictly Disabled (Allowlisted Loopback Only)',
  networkAccess: 'Restricted (Loopback & Authorized Intranet Only)',
  auditLogging: 'Enabled (Tamper-Evident SHA-256 Ledger)',
  credentialStorage: 'Local OS Keyring (Zero Cloud Tokens)',
  gpuStatus: 'Host Hardware (Auto-Detected)',
  encryptionStatus: 'AES-256 at-rest (Local Workspace Partition)',
};

export const INITIAL_HEALTH_COMPONENTS: SystemHealthComponent[] = [
  {
    id: 'ocr',
    name: 'OCR Engine',
    engine: 'Multi-Engine Local OCR (PyMuPDF / EasyOCR / Tesseract)',
    status: 'healthy',
    detail: 'Deterministic local optical character recognition',
    metrics: 'Ready for document processing',
    latency: 'Local',
    device: 'Host Subprocess',
  },
  {
    id: 'parser',
    name: 'Document Parser',
    engine: 'PyMuPDF + Docx + OpenPyXL',
    status: 'healthy',
    detail: 'Extracts canonical AST hierarchy, tables, and image assets',
    metrics: 'Ready for document ingestion',
    latency: 'Local',
    device: 'Host CPU',
  },
  {
    id: 'search',
    name: 'Search Index',
    engine: 'SQLite 3.45+ FTS5 BM25 + Temporal Ranking',
    status: 'healthy',
    detail: 'Local full-text search index and temporal metadata catalog',
    metrics: 'Ready for query execution',
    latency: 'Local',
    device: 'Local Partition',
  },
  {
    id: 'model',
    name: 'Sovereign AI Model',
    engine: 'OpenRouter Cloud Inference (openrouter/free)',
    status: 'healthy',
    detail: 'Single production AI model with deterministic MathEngine guarantee',
    metrics: 'Active / Verified',
    latency: '~1.8s',
    device: 'OpenRouter Gateway',
  },
  {
    id: 'renderer',
    name: 'Report Renderer',
    engine: 'Dual-Template HTML/CSS + Vector PDF Renderer',
    status: 'healthy',
    detail: 'High-precision deterministic corporate layout engine',
    metrics: 'PDF/A compliant vector composition',
    latency: 'Local',
    device: 'Local Subprocess',
  },
];

export const INITIAL_REPORTS: ReportItem[] = [];

export const INITIAL_DATA_SOURCES: DataSourceItem[] = [];

export const INITIAL_PROCESSING_JOBS: ProcessingJobItem[] = [];

export const INITIAL_EVIDENCE_ITEMS: EvidenceItem[] = [];

export const INITIAL_REPORT_SECTIONS: ReportSectionNode[] = [];

export const INITIAL_EDITOR_BLOCKS: EditorBlock[] = [];

export const INITIAL_ASSET_RECORDS: AssetRecord[] = [];

export const INITIAL_VALIDATION_ISSUES: ValidationIssueItem[] = [];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [];
