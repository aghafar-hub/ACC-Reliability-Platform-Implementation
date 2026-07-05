// apps/owner-center/src/modules/oil-analysis/add-sample.types.ts
// Shared types for OA-004 Add Sample / PDF Import workflow.

export type AddSampleReviewStatus = 'pending' | 'saved' | 'skipped' | 'rejected';

export type LabCellColor = 'normal' | 'caution' | 'alert' | 'unknown';

export interface ExtractedLabParameter {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly unit: string;
  readonly cellColor: LabCellColor;
}

export type PdfUploadStatus = 'pending' | 'uploading' | 'stored' | 'placeholder' | 'error';

export interface PdfReference {
  readonly fileName: string;
  readonly localObjectUrl: string | null;
  readonly driveFileId: string | null;
  readonly driveUrl: string | null;
  readonly uploadStatus: PdfUploadStatus;
  readonly uploadMessage: string;
}

export interface AddSampleDraft {
  readonly id: string;
  readonly labSampleId: string;
  readonly equipmentId: string;
  readonly lubricationPointId: string | null;
  readonly suggestedLpId: string | null;
  readonly sampledAt: string;
  readonly lubricant: string;
  readonly reportStatus: 'normal' | 'caution' | 'alert';
  readonly contaminationRating: string;
  readonly equipmentRating: string;
  readonly lubricantRating: string;
  readonly ironPpm: number | null;
  readonly copperPpm: number | null;
  readonly siliconPpm: number | null;
  readonly pqIndex: number | null;
  readonly viscosity100c: number | null;
  readonly waterPercent: number | null;
  readonly sampleAnalysis: string;
  readonly alertType: string;
  readonly labParameters: readonly ExtractedLabParameter[];
  readonly ocrConfidence: number;
  readonly pdf: PdfReference;
  readonly duplicateOfId: string | null;
  readonly overwriteApproved: boolean;
  readonly reviewStatus: AddSampleReviewStatus;
  readonly importSource: 'pdf' | 'manual';
  readonly contractorId: string;
  readonly notes: string;
  readonly trendColumnsIgnored: number;
  readonly reportPattern: string;
}

export type DuplicateResolution = 'skip' | 'overwrite' | 'manual';

export interface AddSampleBatchCounters {
  readonly pending: number;
  readonly saved: number;
  readonly rejected: number;
  readonly skipped: number;
  readonly total: number;
}
