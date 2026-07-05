// apps/owner-center/src/modules/oil-analysis/drive-upload.adapter.ts
// Placeholder Google Drive upload adapter — UI state only until Drive API is available.

import { oilAnalysisSettingsService } from './settings.service';

export type DriveUploadStatus = 'pending' | 'uploading' | 'stored' | 'placeholder' | 'error';

export interface DriveUploadRequest {
  readonly file: File;
  readonly contractorId: string;
}

export interface DriveUploadResult {
  readonly status: DriveUploadStatus;
  readonly driveFileId: string | null;
  readonly driveUrl: string | null;
  readonly localObjectUrl: string;
  readonly fileName: string;
  readonly message: string;
}

/**
 * Simulates Drive upload. When API is missing, returns placeholder fields for UI.
 */
export async function uploadPdfToDrive(request: DriveUploadRequest): Promise<DriveUploadResult> {
  const settings = oilAnalysisSettingsService.getSettings();
  const folder = settings.pdfImport.googleDriveFolder.trim();
  const localObjectUrl = URL.createObjectURL(request.file);

  await new Promise((resolve) => {
    setTimeout(resolve, 250);
  });

  if (!folder) {
    return {
      status: 'placeholder',
      driveFileId: null,
      driveUrl: null,
      localObjectUrl,
      fileName: request.file.name,
      message: 'Google Drive folder not configured — PDF reference stored locally for review only.',
    };
  }

  const pseudoId = `drive-placeholder-${Date.now()}`;
  return {
    status: 'placeholder',
    driveFileId: pseudoId,
    driveUrl: `https://drive.google.com/file/d/${pseudoId}/view`,
    localObjectUrl,
    fileName: request.file.name,
    message: 'Drive upload API pending — placeholder File ID and URL recorded.',
  };
}
