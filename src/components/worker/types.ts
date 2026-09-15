export type ReportType =
  | 'executive'
  | 'technical'
  | 'strategic'
  | 'financial'
  | 'brief'
  | 'research';

export type ReportDepth = 'concise' | 'standard' | 'comprehensive';

export type ReportTone = 'executive' | 'analytical' | 'action-oriented';

export type ActiveView = 'editor' | 'datasource' | 'preview' | 'export' | 'profile';

export interface ReportMetadata {
  title: string;
  reportType: ReportType;
  depth: ReportDepth;
  tone: ReportTone;
  wordCount: number;
  readingTimeMinutes: number;
  generatedAt: string;
}

export interface GeneratedReport {
  id: string;
  jobId?: string;
  fileName: string;
  fileType?: string;
  reportMarkdown: string;
  metadata: ReportMetadata;
  customFocus?: string;
}

export interface SampleDocument {
  id: string;
  title: string;
  category: string;
  badge: string;
  description: string;
  fileName: string;
  content: string;
}

export interface ProcessingStage {
  id: number;
  label: string;
  detail: string;
}

export interface UploadedDataSourceFile {
  id: string;
  name: string;
  type: string;
  size?: number;
  uploadedAt: string;
  fileBase64?: string;
  rawText?: string;
}
