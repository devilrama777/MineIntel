export type AppView =
  | 'dashboard'
  | 'new-report'
  | 'data-sources'
  | 'processing-jobs'
  | 'evidence-search'
  | 'report-planner'
  | 'report-editor'
  | 'asset-manager'
  | 'validation'
  | 'preview'
  | 'export'
  | 'security-audit'
  | 'settings';

export type ProcessingStatus = 'pending' | 'processing' | 'indexed' | 'completed' | 'failed' | 'warning';
export type JobStage =
  | 'Discovering'
  | 'Extracting'
  | 'OCR'
  | 'Table extraction'
  | 'Image extraction'
  | 'Indexing'
  | 'Embedding'
  | 'DISCOVERY'
  | 'INGESTION'
  | 'EXTRACTION'
  | 'NORMALIZATION'
  | 'PLANNING'
  | 'GENERATION'
  | 'VALIDATION'
  | 'COMPOSITION'
  | 'RENDERING'
  | 'READY_FOR_REVIEW'
  | 'Completed'
  | 'Paused'
  | 'Failed'
  | string;

export interface SystemHealthComponent {
  id: string;
  name: string;
  engine: string;
  status: 'healthy' | 'degraded' | 'offline';
  detail: string;
  metrics: string;
  latency?: string;
  device?: string;
}

export interface DataSourceItem {
  id: string;
  filename: string;
  type: 'PDF' | 'Scanned PDF' | 'DOCX' | 'XLSX' | 'CSV' | 'Images' | 'TXT';
  sizeBytes: number;
  dateModified: string;
  sourcePath: string;
  processingStatus: ProcessingStatus;
  pages: number;
  ocrStatus: 'Not Required' | 'Completed' | 'In Progress' | 'Queued' | 'Failed';
  indexedStatus: 'Indexed' | 'Partial' | 'Pending' | 'Error';
  extractedTablesCount: number;
  extractedImagesCount: number;
  summary?: string;
  checksum: string;
}

export interface ProcessingJobItem {
  id: string;
  jobName: string;
  type: 'Full Ingestion' | 'OCR Batch' | 'Table Extraction' | 'Vector Re-Index' | 'Evidence Sync' | 'Report Compilation' | string;
  progress: number;
  currentStage: JobStage;
  startedAt: string;
  elapsedTime: string;
  status: 'running' | 'completed' | 'paused' | 'failed';
  errorsCount: number;
  warningsCount: number;
  filesProcessed: number;
  totalFiles: number;
  logs: string[];
}

export interface EvidenceItem {
  id: string;
  documentId: string;
  documentName: string;
  documentType: DataSourceItem['type'];
  page?: number;
  sectionName?: string;
  spreadsheetName?: string;
  sheetName?: string;
  cellRange?: string;
  relevantText: string;
  metadata: {
    year: number;
    month?: string;
    organizationUnit: string;
    date: string;
    authorOrSource: string;
  };
  confidence: number;
  sourceLocation: string;
  extractionMethod: 'Native Parser' | 'PaddleOCR GPU' | 'Tesseract OCR' | 'Lattice Table Extractor' | 'Vector Embedding Match';
  bbox?: { x: number; y: number; width: number; height: number };
  rawTableData?: string[][];
}

export interface ReportSectionNode {
  id: string;
  title: string;
  level: number;
  children?: ReportSectionNode[];
  aiRationale?: string;
  linkedEvidenceCount: number;
  status: 'planned' | 'drafted' | 'validated' | 'review_required';
  isLocked?: boolean;
  wordCount?: number;
}

export interface EditorBlock {
  id: string;
  sectionId: string;
  type: 'heading' | 'paragraph' | 'table' | 'chart' | 'callout' | 'image' | 'link';
  content?: string;
  caption?: string;
  level?: number;
  calloutType?: 'info' | 'warning' | 'audit' | 'statutory';
  tableData?: {
    headers: string[];
    rows: string[][];
  };
  chartConfig?: {
    type: 'bar' | 'line' | 'pie';
    title: string;
    data: Array<{ label: string; value: number; unit?: string; [key: string]: any }>;
  };
  imageAssetId?: string;
  citationId?: string;
  evidenceRef?: {
    documentName: string;
    location: string;
    verified: boolean;
  };
}

export interface AIEditProposal {
  id: string;
  targetBlockId: string;
  contextSection: string;
  userQuery: string;
  agentStatus: 'searching' | 'analyzed' | 'proposal_ready' | 'applied' | 'rejected';
  searchedEvidence?: {
    sourceFile: string;
    sheetOrPage: string;
    rangeOrSection: string;
    rawSnippet: string;
  };
  originalValue: string;
  verifiedValue: string;
  differenceAnalysis: string;
  proposedText: string;
  confidenceScore: number;
}

export type ValidationCategory =
  | 'Numerical'
  | 'Temporal'
  | 'Source/provenance'
  | 'Structure'
  | 'Content'
  | 'Tables'
  | 'Images'
  | 'Links'
  | 'Layout';

export interface AssetRecord {
  id: string;
  filename: string;
  sourceDocument: string;
  page: number;
  date?: string;
  dateExtracted: string;
  description: string;
  detectedRelevance: 'High' | 'Medium' | 'Supporting' | 'Audit Chart';
  usedInReport: boolean;
  resolution: string;
  dimensions: string | { width: number; height: number };
  category: 'Chart' | 'Diagram' | 'Site Photo' | 'Map' | 'Technical Schema';
  thumbnailUrl: string;
}

export type CorporateAssetItem = AssetRecord;

export interface ValidationIssueItem {
  id: string;
  category: ValidationCategory;
  severity: 'pass' | 'warning' | 'error' | 'high';
  title: string;
  description: string;
  targetSectionId?: string;
  targetSectionTitle?: string;
  sectionId?: string;
  sectionTitle?: string;
  targetBlockId?: string;
  blockId?: string;
  sourceDocumentRef?: string;
  suggestedAction?: string;
  suggestion?: string;
}

export interface ReportItem {
  id: string;
  name: string;
  organization: string;
  reportingPeriod: string;
  description: string;
  createdAt: string;
  lastModified: string;
  status: 'In Progress' | 'In Review' | 'Validated' | 'Ready for Export' | 'Exported';
  sectionsCount: number;
  wordCount: number;
  sourcesLinkedCount: number;
  validationScore: number; // 0-100
  referenceReportUsed?: string;
  selectedModel: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  user: string;
  actor?: string;
  category:
    | 'User Action'
    | 'Report Generation'
    | 'Data Ingestion'
    | 'Agent Action'
    | 'Manual Edit'
    | 'Approval'
    | 'Export'
    | 'Configuration Change';
  severity: 'info' | 'warning' | 'critical';
  action: string;
  target: string;
  resource?: string;
  details: string;
  ipOrOrigin: string;
  verificationHash: string;
  hashSignature?: string;
}

export interface SystemSecurityPosture {
  localAiStatus: string;
  externalAiStatus: string;
  networkAccess: string;
  auditLogging: string;
  credentialStorage: string;
  gpuStatus: string;
  encryptionStatus: string;
}

export type DesktopPlatform = 'linux' | 'macos' | 'windows';

export interface DesktopSystemInfo {
  platform: DesktopPlatform;
  osName: string;
  kernelVersion: string;
  architecture: string;
  runtimeEngine: string;
  localDaemonUrl: string;
  cpuUsagePercent: number;
  vramUsageGb: number;
  totalVramGb: number;
  memoryUsageMb: number;
  totalMemoryMb: number;
  isAirgapped: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  status: string;
  role: string;
  created_at: number;
  updated_at?: number;
  last_login_at?: number;
}

export interface AuthSession {
  session_token: string;
  user: UserProfile;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface FirstRunSetupData {
  username: string;
  display_name: string;
  password: string;
}

export interface SetupStatus {
  has_users: boolean;
  requires_setup: boolean;
}

