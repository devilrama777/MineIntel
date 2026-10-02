export type ReportStatus = 'Approved' | 'Pending' | 'Rejected';

export interface ReportItem {
  id: string; // e.g. RPT-2408-001
  title: string;
  category: 'Safety Audit' | 'Ventilation' | 'Production' | 'Maintenance' | 'Environmental' | 'Geotechnical' | 'DGMS Compliance';
  status: ReportStatus;
  createdAt: string; // e.g. "29 Sep · 14:32"
  timestamp: string;
  summary: string;
  sourcesCount: number;
  wordCount: number;
  pagesCount: number;
  author: string;
  fileSizeEstimate: string;
  markdownContent: string;
}

export type FileType = 'PDF' | 'XLSX' | 'CSV' | 'DOCX' | 'TXT' | 'PNG' | 'JPG';

export interface FileSourceItem {
  id: string;
  name: string;
  type: FileType;
  size: string;
  bytes: number;
  uploadedAt: string; // e.g. "29 Sep · 11:20"
  status: 'Ingested' | 'Processing' | 'Failed';
  tags: string[];
}

export interface UserProfile {
  name: string;
  officerId: string;
  designation: string;
  region: string;
  subsidiary: string;
  email: string;
  phone: string;
  avatarInitials: string;
}

export interface ActivityTickerItem {
  id: string;
  iconType: 'check' | 'bolt' | 'bell';
  text: string;
  timeAgo: string;
  statusLabel?: string;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  aiMode: 'online' | 'offline';
  workspaceAlerts: boolean;
  autoSaveDrafts: boolean;
  highContrastMetrics: boolean;
}

export type TemplateCategory =
  | 'Safety & Statutory'
  | 'Production & Dispatch'
  | 'Mining Operations'
  | 'Quality & Beneficiation'
  | 'Asset & Fleet'
  | 'Financial & Capex'
  | 'Project & Planning'
  | 'Workforce & HR';

export interface RequiredAnnexureItem {
  code: string; // e.g. "Annexure 14"
  title: string;
  type: 'Primary' | 'Supporting Cross-Reference';
  mandatory: boolean;
}

export interface ExpectedDataPointItem {
  field: string;
  unit: string;
  sourceFeed: string;
  threshold: string;
  obligatory: 'Mandatory' | 'High Priority' | 'Conditional';
}

export interface TemplateSchemaDetails {
  statutoryReference: string;
  filingFrequency: string;
  requiredAnnexures: RequiredAnnexureItem[];
  expectedDataPoints: ExpectedDataPointItem[];
}

export interface ReportTemplate {
  id: string;
  annexure: string; // e.g. "Annexure 14"
  name: string;
  officialTitle: string;
  category: TemplateCategory;
  relevance: string; // e.g. "Safety report"
  description: string;
  suggestedFormats: string[];
  sections: string[];
  keyMetrics: string[];
  schema: TemplateSchemaDetails;
  sampleTablePreview: {
    headers: string[];
    rows: string[][];
  };
  markdownTemplate: (params: {
    id: string;
    officerName: string;
    officerId: string;
    region: string;
    dateStr: string;
    sourcesText: string;
  }) => string;
}

