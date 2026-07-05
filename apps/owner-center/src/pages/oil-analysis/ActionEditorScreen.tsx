// OA-005 — New/Edit Engineering Action (Oil Analysis scope).

import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { usePlatformSdk } from '../../context/SdkContext';
import {
  CommentThread,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  SectionCard,
  StatusBadge,
} from '../../components/ui';
import type { StatusBadgeVariant } from '../../components/ui';
import { resolveOilAnalysisContractorScope } from '../../modules/oil-analysis/contractor-scope';
import { lpRegisterService } from '../../modules/oil-analysis/lp-register.service';
import {
  oilAnalysisActionsService,
  resolveCanEditAction,
  actionStatusBadge,
} from '../../modules/oil-analysis/actions.service';
import type { EngineeringAction } from '../../modules/platform/engineering-actions/engineering-action-types';
import {
  ACTION_TYPE_OPTIONS,
  ENGINEERING_ACTION_PRIORITIES,
  ENGINEERING_ACTION_STATUSES,
} from '../../modules/platform/engineering-actions/engineering-action-types';
import { detectOilChangeRequirement } from '../../modules/platform/engineering-actions/action-status';
import { engineeringActionService } from '../../modules/platform/engineering-actions/engineering-action.service';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale === 'ar' ? 'ar-SA' : undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: iso.includes('T') ? '2-digit' : undefined,
    minute: iso.includes('T') ? '2-digit' : undefined,
  });
}

type EditorTab = 'details' | 'history';

const COPY = {
  newTitle: { en: 'New Action', ar: 'إجراء جديد' },
  editTitle: { en: 'Edit Action', ar: 'تعديل الإجراء' },
  subtitle: { en: 'Oil Analysis engineering action', ar: 'إجراء هندسة تحليل الزيت' },
  back: { en: 'Back to Actions', ar: 'العودة إلى الإجراءات' },
  save: { en: 'Save', ar: 'حفظ' },
  cancel: { en: 'Cancel', ar: 'إلغاء' },
  tabDetails: { en: 'Details', ar: 'التفاصيل' },
  tabHistory: { en: 'History', ar: 'السجل' },
  sectionAuto: { en: 'Auto-filled', ar: 'تعبئة تلقائية' },
  sectionEditable: { en: 'Action fields', ar: 'حقول الإجراء' },
  sectionComments: { en: 'Comments', ar: 'التعليقات' },
  sectionThread: { en: 'Comment Thread', ar: 'سلسلة التعليقات' },
  actionNo: { en: 'Action No.', ar: 'رقم الإجراء' },
  source: { en: 'Source', ar: 'المصدر' },
  sampleId: { en: 'Sample ID', ar: 'معرّف العينة' },
  equipmentId: { en: 'Equipment_ID', ar: 'معرّف المعدة' },
  equipmentName: { en: 'Equipment Name', ar: 'اسم المعدة' },
  oilType: { en: 'Oil Type', ar: 'نوع الزيت' },
  contractor: { en: 'Contractor', ar: 'المقاول' },
  createdDate: { en: 'Created Date', ar: 'تاريخ الإنشاء' },
  lpId: { en: 'LP_ID', ar: 'LP_ID' },
  contractorAction: { en: 'Contractor Action', ar: 'إجراء المقاول' },
  accAction: { en: 'ACC Action', ar: 'إجراء ACC' },
  meetingAction: { en: 'Meeting Action', ar: 'إجراء الاجتماع' },
  assignedTo: { en: 'Assigned To', ar: 'مسند إلى' },
  status: { en: 'Status', ar: 'الحالة' },
  priority: { en: 'Priority', ar: 'الأولوية' },
  dueDate: { en: 'Due Date', ar: 'تاريخ الاستحقاق' },
  contractorComment: { en: 'Contractor Comment', ar: 'تعليق المقاول' },
  accComment: { en: 'ACC Comment', ar: 'تعليق ACC' },
  meetingComment: { en: 'Meeting Comment', ar: 'تعليق الاجتماع' },
  generalComment: { en: 'General Comment', ar: 'تعليق عام' },
  oilLubeFlag: {
    en: 'Meeting action requires oil change — Oil Lubrication task dispatch is pending backend integration.',
    ar: 'إجراء الاجتماع يتطلب تغيير الزيت — إرسال مهمة تشحيم الزيت بانتظار تكامل الخلفية.',
  },
  accReviewFlag: {
    en: 'Fast Action submitted — ACC Engineer notification pending.',
    ar: 'تم إرسال الإجراء السريع — إشعار مهندس ACC قيد الانتظار.',
  },
  forbidden: { en: 'You do not have access to this action.', ar: 'لا تملك صلاحية الوصول إلى هذا الإجراء.' },
  notFound: { en: 'Action not found.', ar: 'الإجراء غير موجود.' },
  emptyHistory: { en: 'No history entries yet.', ar: 'لا توجد سجلات بعد.' },
  emptyThread: { en: 'No discussion comments yet.', ar: 'لا توجد تعليقات بعد.' },
  addComment: { en: 'Add comment', ar: 'إضافة تعليق' },
  commentPlaceholder: { en: 'Write a comment…', ar: 'اكتب تعليقاً…' },
} as const;

interface ActionFormState {
  lpId: string;
  contractorAction: string;
  accAction: string;
  meetingAction: string;
  assignedTo: string;
  status: EngineeringAction['status'];
  priority: EngineeringAction['priority'];
  dueDate: string;
  contractorComment: string;
  accComment: string;
  meetingComment: string;
  generalComment: string;
}

function actionToForm(action: EngineeringAction): ActionFormState {
  return {
    lpId: action.lpId,
    contractorAction: action.contractorAction,
    accAction: action.accAction,
    meetingAction: action.meetingAction,
    assignedTo: action.assignedTo,
    status: action.status,
    priority: action.priority,
    dueDate: action.dueDate ?? '',
    contractorComment: action.contractorComment,
    accComment: action.accComment,
    meetingComment: action.meetingComment,
    generalComment: action.generalComment,
  };
}

export default function ActionEditorScreen(): React.ReactElement {
  const { actionId } = useParams<{ actionId: string }>();
  const [searchParams] = useSearchParams();
  const isNew = actionId === 'new' || !actionId;
  const { locale } = useLanguage();
  const l = useCallback((bundle: L10n<string>) => t(bundle, locale), [locale]);
  const sdk = usePlatformSdk();
  const { status: authStatus, user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<EditorTab>('details');
  const [reloadNonce, setReloadNonce] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  const contractorScope = useMemo(
    () => resolveOilAnalysisContractorScope(sdk),
    [sdk],
  );

  const canEdit = resolveCanEditAction(contractorScope);

  const assigneeOptions = useMemo(() => {
    try {
      return sdk.users.list({ limit: 500 }).users.map((u) => u.displayName).filter(Boolean);
    } catch {
      return ['Reliability Engineer', 'ACC Engineer', 'Contractor Engineer'];
    }
  }, [sdk]);

  const lpOptions = useMemo(
    () => lpRegisterService.list(contractorScope),
    [contractorScope],
  );

  const initialLp = searchParams.get('lp') ?? lpOptions[0]?.lpId ?? '';

  const loaded = useMemo(() => {
    if (authStatus !== 'authenticated') {
      return { action: null as EngineeringAction | null, form: null as ActionFormState | null, loadError: null as string | null };
    }
    if (isNew) {
      const lpRow = lpOptions.find((r) => r.lpId === initialLp) ?? lpOptions[0];
      if (!lpRow) {
        return { action: null, form: null, loadError: l(COPY.notFound) };
      }
      return {
        action: null,
        form: {
          lpId: lpRow.lpId,
          contractorAction: '',
          accAction: '',
          meetingAction: '',
          assignedTo: '',
          status: 'Draft' as EngineeringAction['status'],
          priority: 'Medium' as EngineeringAction['priority'],
          dueDate: '',
          contractorComment: '',
          accComment: '',
          meetingComment: '',
          generalComment: '',
        },
        loadError: null,
      };
    }
    try {
      const action = oilAnalysisActionsService.findById(contractorScope, actionId ?? '');
      if (!action) {
        return { action: null, form: null, loadError: l(COPY.forbidden) };
      }
      return { action, form: actionToForm(action), loadError: null };
    } catch (err) {
      return {
        action: null,
        form: null,
        loadError: err instanceof Error ? err.message : 'Load failed',
      };
    }
  }, [actionId, authStatus, contractorScope, initialLp, isNew, l, lpOptions, reloadNonce]);

  const [form, setForm] = useState<ActionFormState | null>(loaded.form);

  React.useEffect(() => {
    setForm(loaded.form);
  }, [loaded.form]);

  const selectedLp = lpOptions.find((row) => row.lpId === form?.lpId);

  const handleField = <K extends keyof ActionFormState>(key: K, value: ActionFormState[K]): void => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async (): Promise<void> => {
    if (!form || !canEdit) return;
    const lpRow = lpOptions.find((r) => r.lpId === form.lpId);
    if (!lpRow) {
      setError(l(COPY.notFound));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const actor = user?.displayName ?? 'User';
      const meetingRequiresOil = detectOilChangeRequirement(form.meetingAction);

      if (isNew) {
        const created = oilAnalysisActionsService.create(
          contractorScope,
          {
            lpId: form.lpId,
            equipmentId: lpRow.equipmentId,
            equipmentName: lpRow.equipmentName,
            contractorId: lpRow.contractorId,
            contractorAction: form.contractorAction,
            accAction: form.accAction,
            meetingAction: form.meetingAction,
            assignedTo: form.assignedTo,
            dueDate: form.dueDate || null,
            priority: form.priority,
            status: form.status,
            contractorComment: form.contractorComment,
            accComment: form.accComment,
            meetingComment: form.meetingComment,
            generalComment: form.generalComment,
            requiresOilLubricationTask: meetingRequiresOil,
          },
          actor,
        );
        navigate(`/oil-analysis/actions/${encodeURIComponent(created.id)}`, { replace: true });
        return;
      }

      oilAnalysisActionsService.update(
        contractorScope,
        actionId ?? '',
        {
          lpId: form.lpId,
          contractorAction: form.contractorAction,
          accAction: form.accAction,
          meetingAction: form.meetingAction,
          assignedTo: form.assignedTo,
          dueDate: form.dueDate || null,
          priority: form.priority,
          status: form.status,
          contractorComment: form.contractorComment,
          accComment: form.accComment,
          meetingComment: form.meetingComment,
          generalComment: form.generalComment,
          requiresOilLubricationTask: meetingRequiresOil,
          meetingActionAccepted: form.status === 'Verified' || form.status === 'Closed',
        },
        actor,
        user?.roles[0],
      );
      setReloadNonce((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = (): void => {
    if (!newComment.trim() || !loaded.action || isNew) return;
    try {
      engineeringActionService.addComment(loaded.action.id, {
        user: user?.displayName ?? 'User',
        company: user?.contractorId,
        role: user?.roles[0],
        timestamp: new Date().toISOString(),
        text: newComment.trim(),
      });
      setNewComment('');
      setReloadNonce((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comment failed');
    }
  };

  if (authStatus === 'loading' || (authStatus === 'authenticated' && !form && !loaded.loadError)) {
    return <LoadingSkeleton variant="form" className="acc-oa-page" />;
  }

  if (loaded.loadError) {
    return (
      <ErrorState
        message={loaded.loadError}
        onRetry={() => setReloadNonce((n) => n + 1)}
        className="acc-oa-page"
      />
    );
  }

  if (!form) {
    return <ErrorState message={l(COPY.notFound)} className="acc-oa-page" />;
  }

  const action = loaded.action;
  const statusBadge = actionStatusBadge(form.status);
  const showOilLubePlaceholder =
    detectOilChangeRequirement(form.meetingAction) ||
    action?.requiresOilLubricationTask;

  return (
    <div className="acc-oa-page acc-oa-action-editor">
      <PageHeader
        title={l(isNew ? COPY.newTitle : COPY.editTitle)}
        subtitle={l(COPY.subtitle)}
        status={{
          variant: statusBadge.variant as StatusBadgeVariant,
          label: statusBadge.label,
        }}
        breadcrumbs={[
          { label: l({ en: 'Oil Analysis', ar: 'تحليل الزيت' }), href: '/oil-analysis' },
          { label: l({ en: 'Actions', ar: 'الإجراءات' }), href: '/oil-analysis/actions' },
          { label: action?.actionNo ?? l(COPY.newTitle) },
        ]}
        actions={(
          <div className="acc-oa-actions__header-actions">
            <button
              type="button"
              className="acc-btn acc-btn--ghost"
              onClick={() => navigate('/oil-analysis/actions')}
            >
              {l(COPY.cancel)}
            </button>
            {canEdit && (
              <button
                type="button"
                className="acc-btn acc-btn--primary"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {l(COPY.save)}
              </button>
            )}
          </div>
        )}
      />

      <div className="acc-oa-action-editor__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'details'}
          className={tab === 'details' ? 'acc-oa-action-editor__tab acc-oa-action-editor__tab--active' : 'acc-oa-action-editor__tab'}
          onClick={() => setTab('details')}
        >
          {l(COPY.tabDetails)}
        </button>
        {!isNew && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'history'}
            className={tab === 'history' ? 'acc-oa-action-editor__tab acc-oa-action-editor__tab--active' : 'acc-oa-action-editor__tab'}
            onClick={() => setTab('history')}
          >
            {l(COPY.tabHistory)}
          </button>
        )}
      </div>

      {error && <p className="acc-oa-action-form__error" role="alert">{error}</p>}

      {action?.fastActionPendingAccReview && (
        <p className="acc-oa-action-editor__notice">{l(COPY.accReviewFlag)}</p>
      )}

      {showOilLubePlaceholder && (
        <p className="acc-oa-action-editor__notice acc-oa-action-editor__notice--info">
          {l(COPY.oilLubeFlag)}
        </p>
      )}

      {tab === 'details' ? (
        <form className="acc-oa-action-editor__form" onSubmit={(e) => e.preventDefault()}>
          <SectionCard title={l(COPY.sectionAuto)}>
            <dl className="acc-oa-action-editor__readonly">
              <div><dt>{l(COPY.actionNo)}</dt><dd>{action?.actionNo ?? '— (assigned on save)'}</dd></div>
              <div><dt>{l(COPY.source)}</dt><dd>Oil Analysis</dd></div>
              <div><dt>{l(COPY.sampleId)}</dt><dd>{action?.sampleId || '—'}</dd></div>
              <div><dt>{l(COPY.equipmentId)}</dt><dd>{selectedLp?.equipmentId ?? action?.equipmentId ?? '—'}</dd></div>
              <div><dt>{l(COPY.equipmentName)}</dt><dd>{selectedLp?.equipmentName ?? action?.equipmentName ?? '—'}</dd></div>
              <div><dt>{l(COPY.oilType)}</dt><dd>{action?.oilType ?? '—'}</dd></div>
              <div><dt>{l(COPY.contractor)}</dt><dd>{action?.contractorName ?? selectedLp?.contractorId ?? '—'}</dd></div>
              <div><dt>{l(COPY.createdDate)}</dt><dd>{action ? formatDate(action.createdAt, locale) : '—'}</dd></div>
            </dl>
          </SectionCard>

          <SectionCard title={l(COPY.sectionEditable)}>
            <div className="acc-oa-action-form acc-oa-action-form--grid">
              <label className="acc-oa-action-form__field">
                <span>{l(COPY.lpId)}</span>
                <select
                  value={form.lpId}
                  onChange={(e) => handleField('lpId', e.target.value)}
                  disabled={!canEdit}
                >
                  {lpOptions.map((row) => (
                    <option key={row.lpId} value={row.lpId}>{row.lpId} — {row.equipmentName}</option>
                  ))}
                </select>
              </label>

              <label className="acc-oa-action-form__field">
                <span>{l(COPY.contractorAction)}</span>
                <select
                  value={form.contractorAction}
                  onChange={(e) => handleField('contractorAction', e.target.value)}
                  disabled={!canEdit}
                >
                  <option value="">—</option>
                  {ACTION_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>

              <label className="acc-oa-action-form__field">
                <span>{l(COPY.accAction)}</span>
                <select
                  value={form.accAction}
                  onChange={(e) => handleField('accAction', e.target.value)}
                  disabled={!canEdit}
                >
                  <option value="">—</option>
                  {ACTION_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>

              <label className="acc-oa-action-form__field">
                <span>{l(COPY.meetingAction)}</span>
                <select
                  value={form.meetingAction}
                  onChange={(e) => handleField('meetingAction', e.target.value)}
                  disabled={!canEdit}
                >
                  <option value="">—</option>
                  {ACTION_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>

              <label className="acc-oa-action-form__field">
                <span>{l(COPY.assignedTo)}</span>
                <select
                  value={form.assignedTo}
                  onChange={(e) => handleField('assignedTo', e.target.value)}
                  disabled={!canEdit}
                >
                  <option value="">—</option>
                  {assigneeOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>

              <label className="acc-oa-action-form__field">
                <span>{l(COPY.status)}</span>
                <select
                  value={form.status}
                  onChange={(e) => handleField('status', e.target.value as EngineeringAction['status'])}
                  disabled={!canEdit}
                >
                  {ENGINEERING_ACTION_STATUSES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>

              <label className="acc-oa-action-form__field">
                <span>{l(COPY.priority)}</span>
                <select
                  value={form.priority}
                  onChange={(e) => handleField('priority', e.target.value as EngineeringAction['priority'])}
                  disabled={!canEdit}
                >
                  {ENGINEERING_ACTION_PRIORITIES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>

              <label className="acc-oa-action-form__field">
                <span>{l(COPY.dueDate)}</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => handleField('dueDate', e.target.value)}
                  disabled={!canEdit}
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard title={l(COPY.sectionComments)}>
            <div className="acc-oa-action-form acc-oa-action-form--grid">
              <label className="acc-oa-action-form__field acc-oa-action-form__field--full">
                <span>{l(COPY.contractorComment)}</span>
                <textarea
                  value={form.contractorComment}
                  onChange={(e) => handleField('contractorComment', e.target.value)}
                  rows={2}
                  disabled={!canEdit}
                />
              </label>
              <label className="acc-oa-action-form__field acc-oa-action-form__field--full">
                <span>{l(COPY.accComment)}</span>
                <textarea
                  value={form.accComment}
                  onChange={(e) => handleField('accComment', e.target.value)}
                  rows={2}
                  disabled={!canEdit}
                />
              </label>
              <label className="acc-oa-action-form__field acc-oa-action-form__field--full">
                <span>{l(COPY.meetingComment)}</span>
                <textarea
                  value={form.meetingComment}
                  onChange={(e) => handleField('meetingComment', e.target.value)}
                  rows={2}
                  disabled={!canEdit}
                />
              </label>
              <label className="acc-oa-action-form__field acc-oa-action-form__field--full">
                <span>{l(COPY.generalComment)}</span>
                <textarea
                  value={form.generalComment}
                  onChange={(e) => handleField('generalComment', e.target.value)}
                  rows={3}
                  disabled={!canEdit}
                />
              </label>
            </div>
          </SectionCard>

          {!isNew && action && (
            <SectionCard title={l(COPY.sectionThread)}>
              <CommentThread
                comments={action.commentThread.map((c) => ({
                  id: c.id,
                  user: c.user,
                  company: c.company,
                  role: c.role,
                  timestamp: formatDate(c.timestamp, locale),
                  text: c.text,
                }))}
                emptyLabel={l(COPY.emptyThread)}
              />
              {canEdit && (
                <div className="acc-oa-action-editor__comment-add">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={l(COPY.commentPlaceholder)}
                    rows={2}
                  />
                  <button type="button" className="acc-btn acc-btn--secondary" onClick={handleAddComment}>
                    {l(COPY.addComment)}
                  </button>
                </div>
              )}
            </SectionCard>
          )}
        </form>
      ) : (
        action && (
          <SectionCard title={l(COPY.tabHistory)} empty={action.history.length === 0} emptyTitle={l(COPY.emptyHistory)}>
            <ul className="acc-oa-action-history" role="list">
              {[...action.history].reverse().map((entry) => (
                <li key={entry.id} className="acc-oa-action-history__item">
                  <header className="acc-oa-action-history__header">
                    <strong>{entry.summary}</strong>
                    <time dateTime={entry.timestamp}>{formatDate(entry.timestamp, locale)}</time>
                  </header>
                  <p className="acc-oa-action-history__meta">
                    {entry.actor}
                    {entry.actorRole ? ` · ${entry.actorRole}` : ''}
                    {entry.previousStatus && entry.newStatus
                      ? ` · ${entry.previousStatus} → ${entry.newStatus}`
                      : entry.newStatus
                        ? ` · ${entry.newStatus}`
                        : ''}
                    {entry.notificationPending ? ' · Notification pending' : ''}
                  </p>
                  {entry.details && <p className="acc-oa-action-history__details">{entry.details}</p>}
                </li>
              ))}
            </ul>
          </SectionCard>
        )
      )}
    </div>
  );
}
