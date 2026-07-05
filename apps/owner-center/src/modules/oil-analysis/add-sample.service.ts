// apps/owner-center/src/modules/oil-analysis/add-sample.service.ts
// OA-004 Add Sample / PDF Import workflow — batch queue, duplicate detection, smart LP mapping.

import { extractLatestSampleFromPdf } from './pdf-extraction.adapter';
import { uploadPdfToDrive } from './drive-upload.adapter';
import { rememberLpMapping, suggestLpMapping } from './lp-mapping-memory.service';
import {
  oilSampleService,
  type OilLabResultInput,
  type OilPdfImportReviewInput,
} from './sample.service';
import { engineeringActionService } from '../platform/engineering-actions/engineering-action.service';
import type { OilAnalysisContractorScope } from './contractor-scope';
import type {
  AddSampleBatchCounters,
  AddSampleDraft,
  AddSampleReviewStatus,
  DuplicateResolution,
  PdfReference,
} from './add-sample.types';

const QUEUE_STORAGE_KEY = 'acc.oil-analysis.add-sample.queue.v1';

function isoNow(): string {
  return new Date().toISOString();
}

function generateDraftId(): string {
  return `as-draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function resolvePdfUrl(pdf: PdfReference): string {
  if (pdf.driveUrl && /^https?:\/\//i.test(pdf.driveUrl)) return pdf.driveUrl;
  const name = encodeURIComponent(pdf.fileName || 'report.pdf');
  return `https://placeholder.local/oil-analysis/pdf/${name}`;
}

function readQueue(): AddSampleDraft[] {
  try {
    const raw = sessionStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AddSampleDraft[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(drafts: readonly AddSampleDraft[]): void {
  sessionStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(drafts));
}

function toLabResults(draft: AddSampleDraft): OilLabResultInput {
  return {
    contaminationRating: draft.contaminationRating,
    equipmentRating: draft.equipmentRating,
    lubricantRating: draft.lubricantRating,
    ironPpm: draft.ironPpm,
    copperPpm: draft.copperPpm,
    siliconPpm: draft.siliconPpm,
    pqIndex: draft.pqIndex,
    viscosity100c: draft.viscosity100c,
    tan: null,
    oxidation: null,
    waterPercent: draft.waterPercent,
    particle4: null,
    particle6: null,
    particle14: null,
    sampleAnalysis: draft.sampleAnalysis,
    alertType: draft.alertType,
  };
}

function toReviewInput(draft: AddSampleDraft, overwriteReason?: string): OilPdfImportReviewInput {
  return {
    equipmentId: draft.equipmentId,
    labSampleId: draft.labSampleId,
    sampledAt: draft.sampledAt,
    lubricant: draft.lubricant,
    contractorId: draft.contractorId,
    lubricationPointId: draft.lubricationPointId,
    notes: draft.notes,
    labResults: toLabResults(draft),
    pdf: {
      pdfFileName: draft.pdf.fileName,
      pdfFileUrl: resolvePdfUrl(draft.pdf),
    },
    overwriteReason,
  };
}

function shouldCreateDraftAction(draft: AddSampleDraft): boolean {
  return draft.reportStatus === 'alert' || draft.reportStatus === 'caution';
}

class AddSampleService {
  getQueue(): readonly AddSampleDraft[] {
    return readQueue();
  }

  getPendingQueue(): readonly AddSampleDraft[] {
    return readQueue().filter((d) => d.reviewStatus === 'pending');
  }

  computeCounters(): AddSampleBatchCounters {
    const queue = readQueue();
    return {
      pending: queue.filter((d) => d.reviewStatus === 'pending').length,
      saved: queue.filter((d) => d.reviewStatus === 'saved').length,
      rejected: queue.filter((d) => d.reviewStatus === 'rejected').length,
      skipped: queue.filter((d) => d.reviewStatus === 'skipped').length,
      total: queue.length,
    };
  }

  clearQueue(): void {
    writeQueue([]);
  }

  findDraft(id: string): AddSampleDraft | null {
    return readQueue().find((d) => d.id === id) ?? null;
  }

  updateDraft(id: string, changes: Partial<AddSampleDraft>): AddSampleDraft {
    const queue = readQueue();
    const idx = queue.findIndex((d) => d.id === id);
    if (idx < 0) throw new Error('Review item not found.');
    const updated: AddSampleDraft = { ...queue[idx] as AddSampleDraft, ...changes };
    queue[idx] = updated;
    writeQueue(queue);
    return updated;
  }

  async processPdfFiles(
    files: readonly File[],
    scope: OilAnalysisContractorScope,
  ): Promise<readonly AddSampleDraft[]> {
    const contractorId = scope.lockedContractorId;
    const created: AddSampleDraft[] = [];

    for (const file of files) {
      const drive = await uploadPdfToDrive({ file, contractorId });
      const extracted = await extractLatestSampleFromPdf({ file, contractorId });
      const duplicate = oilSampleService.findByLabSampleId(extracted.labSampleId);
      const suggestedLpId = suggestLpMapping(extracted.equipmentId, extracted.reportPattern);

      const pdf: PdfReference = {
        fileName: drive.fileName,
        localObjectUrl: drive.localObjectUrl,
        driveFileId: drive.driveFileId,
        driveUrl: drive.driveUrl,
        uploadStatus: drive.status,
        uploadMessage: drive.message,
      };

      created.push({
        id: generateDraftId(),
        labSampleId: extracted.labSampleId,
        equipmentId: extracted.equipmentId,
        lubricationPointId: suggestedLpId,
        suggestedLpId,
        sampledAt: extracted.sampledAt,
        lubricant: extracted.lubricant,
        reportStatus: extracted.reportStatus,
        contaminationRating: extracted.contaminationRating,
        equipmentRating: extracted.equipmentRating,
        lubricantRating: extracted.lubricantRating,
        ironPpm: extracted.ironPpm,
        copperPpm: extracted.copperPpm,
        siliconPpm: extracted.siliconPpm,
        pqIndex: extracted.pqIndex,
        viscosity100c: extracted.viscosity100c,
        waterPercent: extracted.waterPercent,
        sampleAnalysis: extracted.sampleAnalysis,
        alertType: extracted.alertType,
        labParameters: extracted.labParameters,
        ocrConfidence: extracted.ocrConfidence,
        pdf,
        duplicateOfId: duplicate?.id ?? null,
        overwriteApproved: false,
        reviewStatus: 'pending',
        importSource: 'pdf',
        contractorId,
        notes: '',
        trendColumnsIgnored: extracted.trendColumnsIgnored,
        reportPattern: extracted.reportPattern,
      });
    }

    writeQueue([...readQueue(), ...created]);
    return created;
  }

  createManualDraft(
    input: {
      equipmentId: string;
      labSampleId: string;
      sampledAt: string;
      lubricant?: string;
      lubricationPointId?: string;
      notes?: string;
    },
    scope: OilAnalysisContractorScope,
  ): AddSampleDraft {
    const duplicate = oilSampleService.findByLabSampleId(input.labSampleId.trim());
    const reportPattern = 'manual';
    const suggestedLpId =
      input.lubricationPointId?.trim() ||
      suggestLpMapping(input.equipmentId.trim(), reportPattern);

    const draft: AddSampleDraft = {
      id: generateDraftId(),
      labSampleId: input.labSampleId.trim(),
      equipmentId: input.equipmentId.trim(),
      lubricationPointId: suggestedLpId,
      suggestedLpId,
      sampledAt: input.sampledAt.trim(),
      lubricant: input.lubricant?.trim() ?? '',
      reportStatus: 'normal',
      contaminationRating: 'Normal',
      equipmentRating: 'Normal',
      lubricantRating: 'Normal',
      ironPpm: null,
      copperPpm: null,
      siliconPpm: null,
      pqIndex: null,
      viscosity100c: null,
      waterPercent: null,
      sampleAnalysis: 'Manual backup entry — laboratory values to be entered during review.',
      alertType: '',
      labParameters: [],
      ocrConfidence: 1,
      pdf: {
        fileName: '',
        localObjectUrl: null,
        driveFileId: null,
        driveUrl: null,
        uploadStatus: 'placeholder',
        uploadMessage: 'Manual entry — no PDF attached.',
      },
      duplicateOfId: duplicate?.id ?? null,
      overwriteApproved: false,
      reviewStatus: 'pending',
      importSource: 'manual',
      contractorId: scope.lockedContractorId,
      notes: input.notes?.trim() ?? '',
      trendColumnsIgnored: 0,
      reportPattern,
    };

    writeQueue([...readQueue(), draft]);
    return draft;
  }

  resolveDuplicate(draftId: string, resolution: DuplicateResolution): AddSampleDraft {
    const draft = this.findDraft(draftId);
    if (!draft) throw new Error('Review item not found.');
    if (!draft.duplicateOfId) throw new Error('Item is not flagged as duplicate.');

    switch (resolution) {
      case 'skip':
        return this.updateDraft(draftId, { reviewStatus: 'skipped' });
      case 'overwrite':
        return this.updateDraft(draftId, { overwriteApproved: true });
      case 'manual':
        return this.updateDraft(draftId, {
          overwriteApproved: false,
          importSource: 'manual',
          notes: draft.notes || 'Opened for manual review after duplicate detection.',
        });
      default:
        throw new Error('Unknown duplicate resolution.');
    }
  }

  rejectDraft(draftId: string): AddSampleDraft {
    return this.updateDraft(draftId, { reviewStatus: 'rejected' });
  }

  saveReviewedDraft(
    draftId: string,
    actor: string,
    options?: { overwriteReason?: string },
  ): { draft: AddSampleDraft; sampleInternalId: string; draftActionCreated: boolean } {
    const draft = this.findDraft(draftId);
    if (!draft) throw new Error('Review item not found.');
    if (draft.reviewStatus !== 'pending') throw new Error('Item is not pending review.');

    if (draft.duplicateOfId && !draft.overwriteApproved) {
      throw new Error('Duplicate sample requires engineer approval to overwrite or manual review.');
    }

    const reviewInput = toReviewInput(draft, options?.overwriteReason);

    const savedRow = draft.duplicateOfId && draft.overwriteApproved
      ? oilSampleService.overwriteFromPdfImportReview(
          draft.duplicateOfId,
          reviewInput,
          actor,
        )
      : oilSampleService.saveFromPdfImportReview(reviewInput, actor);

    if (draft.lubricationPointId) {
      rememberLpMapping(draft.equipmentId, draft.lubricationPointId, draft.reportPattern);
    }

    let draftActionCreated = false;
    if (shouldCreateDraftAction(draft)) {
      const action = engineeringActionService.createDraftFromSample(
        'Oil Analysis',
        savedRow.id,
        actor,
      );
      draftActionCreated = action !== null;
    }

    const updated = this.updateDraft(draftId, { reviewStatus: 'saved' as AddSampleReviewStatus });
    return { draft: updated, sampleInternalId: savedRow.id, draftActionCreated };
  }
}

export const addSampleService = new AddSampleService();

export { suggestLpMapping, rememberLpMapping } from './lp-mapping-memory.service';
export type { AddSampleDraft, AddSampleBatchCounters, DuplicateResolution } from './add-sample.types';
