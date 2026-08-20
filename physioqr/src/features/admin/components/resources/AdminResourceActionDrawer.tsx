import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Plus, RefreshCw, Save } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { AgentRecordForm } from '@/features/admin/components/AgentRecordForm';
import {
  asRecord,
  displayValue,
  extractItems,
  formatDate,
  getValue,
  recordObjectId,
  type AdminResourceConfig,
  type AdminResourceKey,
  type ApiRecord,
  type DrawerState,
} from '@/features/admin/resources';

export function AdminResourceActionDrawer({
  drawer,
  moduleKey,
  config,
  onClose,
  onRefresh,
}: {
  drawer: DrawerState | null;
  moduleKey: AdminResourceKey;
  config: AdminResourceConfig;
  onClose: () => void;
  onRefresh: () => void;
}) {
  return (
    <Modal isOpen={!!drawer} onClose={onClose} title={drawerTitle(drawer, config)} size="xl">
      {drawer?.mode === 'details' && <RecordPreview row={drawer.row ?? {}} config={config} />}
      {drawer?.mode === 'doctor-action' && (
        <DoctorActionForm row={drawer.row ?? {}} action={drawer.action ?? 'approve'} onClose={onClose} onRefresh={onRefresh} />
      )}
      {drawer?.mode === 'risk-action' && (
        <RiskReviewForm row={drawer.row ?? {}} status={drawer.action ?? 'cleared'} onClose={onClose} onRefresh={onRefresh} />
      )}
      {drawer?.mode === 'fraud-action' && (
        <FraudReviewForm row={drawer.row ?? {}} status={drawer.action ?? 'reviewing'} onClose={onClose} onRefresh={onRefresh} />
      )}
      {drawer?.mode === 'program-day' && <ProgramDayBuilder row={drawer.row ?? {}} onClose={onClose} onRefresh={onRefresh} />}
      {drawer?.mode === 'record-form' && (
        <RecordForm moduleKey={moduleKey} row={drawer.row} action={drawer.action} onClose={onClose} onRefresh={onRefresh} />
      )}
      {drawer?.mode === 'visit-detail' && <ClinicVisitDetail row={drawer.row ?? {}} onClose={onClose} />}
    </Modal>
  );
}

function drawerTitle(drawer: DrawerState | null, config: AdminResourceConfig) {
  if (!drawer) return config.title;
  if (drawer.mode === 'record-form') return `${drawer.row ? 'Edit' : 'Create'} ${config.title}`;
  if (drawer.mode === 'program-day') return 'Program day-wise builder';
  if (drawer.mode === 'doctor-action') {
    const labels: Record<string, string> = {
      approve: 'Approve Doctor',
      'request-documents': 'Request Doctor Documents',
      reject: 'Reject Doctor',
      suspend: 'Suspend Doctor',
      'disable-qr': 'Disable QR Code',
      'reactivate-qr': 'Reactivate QR Code',
    };
    return labels[drawer.action ?? ''] ?? `Doctor ${drawer.action}`;
  }
  if (drawer.mode === 'risk-action') return 'Clinical risk decision';
  if (drawer.mode === 'fraud-action') return 'Fraud review decision';
  if (drawer.mode === 'visit-detail') return 'Clinic Visit Detail';
  return `${config.title} details`;
}

function ClinicVisitDetail({ row, onClose }: { row: ApiRecord; onClose: () => void }) {
  const outcomeLabels: Record<string, string> = {
    doctor_registered: 'Doctor Registered', interested: 'Interested', follow_up_required: 'Follow-up Required',
    not_interested: 'Not Interested', call_later: 'Call Later', clinic_closed: 'Clinic Closed', incorrect_location: 'Incorrect Location',
  };
  const followUpLabels: Record<string, string> = {
    not_required: 'Not Required', scheduled: 'Scheduled', completed: 'Completed', missed: 'Missed', cancelled: 'Cancelled',
  };
  const interestLabels: Record<string, string> = {
    very_interested: 'Very Interested', interested: 'Interested', neutral: 'Neutral', not_interested: 'Not Interested',
  };
  const field = (label: string, value: unknown) => (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-neutral-900">{displayValue(value)}</div>
    </div>
  );
  const outcome = displayValue(row.outcome);
  const followUpStatus = displayValue(row.followUpStatus);
  const interestLevel = displayValue(row.doctorInterestLevel);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {field('Clinic Name', row.clinicName || row.doctorName)}
        {field('Doctor', getValue(row, 'doctor.fullName') || row.doctorName)}
        {field('Agent', getValue(row, 'agent.fullName'))}
        {field('Visit Date', formatDate(row.visitDate))}
        {field('Visit Time', displayValue(row.visitTime))}
        {field('Location', displayValue(row.clinicLocation))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatusCard label="Outcome" value={outcomeLabels[outcome] ?? outcome} />
        <StatusCard label="Follow-up Status" value={followUpLabels[followUpStatus] ?? followUpStatus} />
        <StatusCard label="Interest Level" value={interestLabels[interestLevel] ?? interestLevel} />
      </div>
      {!!(row.discussionDetails || row.followUpNotes || row.nextAction) && (
        <div className="space-y-3">
          {!!row.discussionDetails && field('Discussion Details', row.discussionDetails)}
          {!!row.followUpNotes && field('Follow-up Notes', row.followUpNotes)}
          {!!row.nextAction && field('Next Action', row.nextAction)}
        </div>
      )}
      {!!(row.followUpDate || row.followUpCompletedAt) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {!!row.followUpDate && field('Follow-up Date', formatDate(row.followUpDate))}
          {!!row.followUpCompletedAt && field('Completed At', formatDate(row.followUpCompletedAt))}
        </div>
      )}
      {Array.isArray(row.documentsCollected) && (row.documentsCollected as string[]).length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Documents Collected</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(row.documentsCollected as string[]).map((doc) => (
              <span key={doc} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">{doc}</span>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Close</button>
      </div>
    </div>
  );
}

function DoctorActionForm({ row, action, onClose, onRefresh }: { row: ApiRecord; action: string; onClose: () => void; onRefresh: () => void }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const doctorId = recordObjectId(row);
  const mutation = useMutation({
    mutationFn: async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      if (action === 'approve') return apiClient.post(`/doctors/${doctorId}/approve`, {
        approvedPatientFee: Number(form.get('approvedPatientFee') || 0),
        feeSharePercentage: Number(form.get('feeSharePercentage') || 0),
        feeShareHoldingDays: Number(form.get('feeShareHoldingDays') || 15),
        revenueModel: form.get('revenueModel'), feeShareType: form.get('feeShareType'),
        fixedFeeShareAmount: Number(form.get('fixedFeeShareAmount') || 0),
        password: String(form.get('password') || '') || undefined,
      });
      if (action === 'request-documents') return apiClient.post(`/doctors/${doctorId}/request-documents`, { reason: form.get('reason') });
      if (action === 'suspend') return apiClient.post(`/doctors/${doctorId}/suspend`, { reason: form.get('reason') });
      if (action === 'disable-qr') return apiClient.post(`/doctors/${doctorId}/disable-qr`);
      if (action === 'reactivate-qr') return apiClient.post(`/doctors/${doctorId}/reactivate-qr`);
      return apiClient.post(`/doctors/${doctorId}/reject`, { reason: form.get('reason') });
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-resource-page'] });
      onRefresh();
      const temporaryPassword = asRecord(response.data).temporaryPassword;
      setMessage(temporaryPassword ? `Doctor approved. Temporary password: ${temporaryPassword}` : 'Action completed and audit log generated.');
    },
  });
  const docs = Array.isArray(row.kycDocuments) ? (row.kycDocuments as ApiRecord[]) : [];

  return (
    <form className="space-y-5" onSubmit={(event) => mutation.mutate(event)}>
      <DecisionNotice title="This action changes doctor operational access" />
      <RecordSummary row={row} fields={['doctorId', 'fullName', 'clinicName', 'status', 'kycStatus', 'qrCodeActive']} />
      {action === 'approve' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="approvedPatientFee" label="Approved patient fee" type="number" defaultValue={displayValue(row.approvedPatientFee === undefined ? row.requestedPatientFee : row.approvedPatientFee)} required />
          <Input name="feeSharePercentage" label="Fee share percentage" type="number" defaultValue={displayValue(row.feeSharePercentage ?? 60)} required />
          <Input name="feeShareHoldingDays" label="Holding days" type="number" defaultValue={displayValue(row.feeShareHoldingDays ?? 15)} required />
          <Select name="revenueModel" label="Revenue model" defaultValue={displayValue(row.revenueModel ?? 'split')} options={[["split", "Split Model"], ["platform_fee", "Platform Fee Model"]]} />
          <Select name="feeShareType" label="Fee share type" defaultValue={displayValue(row.feeShareType ?? 'percentage')} options={[["percentage", "Percentage"], ["fixed", "Fixed Amount"], ["slab", "Slab Based"]]} />
          <Input name="fixedFeeShareAmount" label="Fixed fee share amount" type="number" defaultValue={displayValue(row.fixedFeeShareAmount ?? 0)} />
          <Input name="password" label="Optional login password" placeholder="Leave blank to auto-generate" wide />
        </div>
      ) : action === 'disable-qr' || action === 'reactivate-qr' ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
          {action === 'disable-qr' ? "This will immediately deactivate the doctor's QR code. Patients cannot scan or register until it is reactivated." : "This will reactivate the doctor's QR code and allow patients to scan and register again."}
        </div>
      ) : (
        <label className="block"><span className="text-sm font-semibold text-neutral-700">Reason <span className="text-rose-500">*</span></span><textarea name="reason" required className="mt-2 min-h-28 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Decision reason required for audit trail" /></label>
      )}
      {docs.length > 0 && <KycDocumentList doctorId={doctorId} docs={docs} />}
      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</div>}
      <ActionError error={mutation.error} />
      <FormActions isSaving={mutation.isPending} onClose={onClose} submitLabel={`Confirm ${action}`} />
    </form>
  );
}

function KycDocumentList({ doctorId, docs }: { doctorId: string; docs: ApiRecord[] }) {
  const [error, setError] = useState<string | null>(null);
  const openDocument = async (documentId: string) => {
    try {
      setError(null);
      const response = await apiClient.get(`/doctors/${doctorId}/kyc-documents/${documentId}/access`);
      const url = displayValue(asRecord(response.data).url);
      if (url && url !== '-') window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) { setError(errorMessage(err)); }
  };
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-bold text-neutral-900">Secure KYC document access</h3>
      <p className="mt-1 text-xs text-neutral-500">Documents open through backend-generated short-lived URLs. Bank details stay masked in the UI.</p>
      <div className="mt-4 space-y-2">
        {docs.map((doc) => (
          <button key={recordObjectId(doc)} type="button" onClick={() => openDocument(recordObjectId(doc))} className="flex w-full items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50">
            <span><span className="block font-semibold text-neutral-900">{displayValue(doc.documentType)}</span><span className="block text-xs text-neutral-500">{displayValue(doc.originalName)} | {displayValue(doc.storageProvider)}</span></span>
            <ExternalLink className="h-4 w-4 text-neutral-500" />
          </button>
        ))}
      </div>
      {error && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
    </section>
  );
}

function RiskReviewForm({ row, status, onClose, onRefresh }: { row: ApiRecord; status: string; onClose: () => void; onRefresh: () => void }) {
  const mutation = useDecisionMutation(`/admin/risk-reviews/${recordObjectId(row)}`, 'patch', onClose, onRefresh);
  return <form className="space-y-5" onSubmit={(event) => mutation.mutate(formPayload(event, { status, noteField: 'adminReviewNote' }))}><DecisionNotice title="Clinical safety decision" /><RecordSummary row={row} fields={['patient.fullName', 'patient.mobile', 'painCategory.name', 'status', 'adminReviewNote']} /><label className="block"><span className="text-sm font-semibold text-neutral-700">Admin review note</span><textarea name="adminReviewNote" required className="mt-2 min-h-28 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" /></label><ActionError error={mutation.error} /><FormActions isSaving={mutation.isPending} onClose={onClose} submitLabel={`Mark ${status}`} /></form>;
}

function FraudReviewForm({ row, status, onClose, onRefresh }: { row: ApiRecord; status: string; onClose: () => void; onRefresh: () => void }) {
  const mutation = useDecisionMutation(`/admin/fraud-cases/${recordObjectId(row)}/review`, 'patch', onClose, onRefresh);
  return <form className="space-y-5" onSubmit={(event) => mutation.mutate(formPayload(event, { status, noteField: 'note' }))}><DecisionNotice title="Fraud review decision" /><RecordSummary row={row} fields={['rule', 'summary', 'severity', 'status', 'doctor.fullName', 'payment.invoiceNumber']} /><label className="block"><span className="text-sm font-semibold text-neutral-700">Review note</span><textarea name="note" required className="mt-2 min-h-28 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" /></label><ActionError error={mutation.error} /><FormActions isSaving={mutation.isPending} onClose={onClose} submitLabel={`Mark ${status}`} /></form>;
}

function ProgramDayBuilder({ row, onClose, onRefresh }: { row: ApiRecord; onClose: () => void; onRefresh: () => void }) {
  const programId = recordObjectId(row);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const daysQuery = useQuery({ queryKey: ['admin-program-days', programId], queryFn: async () => (await apiClient.get(`/programs/${programId}/days`)).data });
  const exercisesQuery = useQuery({ queryKey: ['admin-exercise-picker'], queryFn: async () => (await apiClient.get('/exercises', { params: { limit: 100, sortBy: 'name', sortOrder: 'asc' } })).data });
  const mutation = useMutation({
    mutationFn: async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const manualExerciseIds = String(form.get('exerciseIds') || '').split(',').map((item) => item.trim()).filter(Boolean);
      const exerciseIds = [...new Set([...selectedExerciseIds, ...manualExerciseIds])].map((exercise, index) => ({ exercise, displayOrder: index + 1 }));
      return apiClient.post(`/programs/${programId}/days`, { dayNumber: Number(form.get('dayNumber') || 1), title: form.get('title'), exercises: exerciseIds });
    },
    onSuccess: async () => { await daysQuery.refetch(); onRefresh(); setSelectedExerciseIds([]); setExerciseSearch(''); },
  });
  const days = extractItems(daysQuery.data);
  const exercises = extractItems(exercisesQuery.data);
  const filteredExercises = exercises.filter((exercise) => {
    const query = exerciseSearch.trim().toLowerCase();
    if (!query) return true;
    return [exercise.name, exercise.description, exercise.videoUrl, exercise.language].filter(Boolean).some((value) => displayValue(value).toLowerCase().includes(query));
  }).slice(0, 12);
  const toggleExercise = (exerciseId: string) => setSelectedExerciseIds((current) => current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId]);

  return (
    <div className="space-y-5">
      <RecordSummary row={row} fields={['programCode', 'name', 'durationDays', 'difficultyLevel', 'isActive']} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-neutral-200 bg-white p-4"><h3 className="text-sm font-bold text-neutral-900">Existing days</h3><div className="mt-4 space-y-3">{daysQuery.isLoading && <Skeleton className="h-24 w-full" />}{!daysQuery.isLoading && days.length === 0 && <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">No days added yet.</div>}{days.map((day) => <div key={recordObjectId(day)} className="rounded-lg border border-neutral-200 p-3"><div className="font-semibold text-neutral-900">Day {displayValue(day.dayNumber)}: {displayValue(day.title)}</div><div className="text-xs text-neutral-500">{Array.isArray(day.exercises) ? day.exercises.length : 0} exercises attached</div></div>)}</div></section>
        <form className="rounded-lg border border-neutral-200 bg-neutral-50 p-4" onSubmit={(event) => mutation.mutate(event)}>
          <h3 className="text-sm font-bold text-neutral-900">Add program day</h3>
          <div className="mt-4 space-y-4"><Input name="dayNumber" label="Day number" type="number" defaultValue="1" required /><Input name="title" label="Day title" placeholder="Stability and balance" /><div className="rounded-lg border border-neutral-200 bg-white p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-neutral-700">Attach exercises</span><span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700">{selectedExerciseIds.length} selected</span></div><input value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} placeholder="Search exercise title, language, or video" className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" /><div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">{exercisesQuery.isLoading && <Skeleton className="h-20 w-full" />}{!exercisesQuery.isLoading && filteredExercises.length === 0 && <div className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-500">No exercises found.</div>}{filteredExercises.map((exercise) => { const exerciseId = recordObjectId(exercise); const selected = selectedExerciseIds.includes(exerciseId); return <button key={exerciseId} type="button" onClick={() => toggleExercise(exerciseId)} className={cn('w-full rounded-lg border p-3 text-left transition-colors', selected ? 'border-primary-300 bg-primary-50' : 'border-neutral-200 bg-white hover:bg-neutral-50')}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-bold text-neutral-900">{displayValue(exercise.name)}</div><div className="mt-1 truncate text-xs text-neutral-500">{displayValue(exercise.videoUrl || exercise.description)}</div></div><span className={cn('mt-0.5 h-4 w-4 rounded border', selected ? 'border-primary-600 bg-primary-600' : 'border-neutral-300')} /></div></button>; })}</div></div><label className="block"><span className="text-sm font-semibold text-neutral-700">Manual exercise IDs</span><textarea name="exerciseIds" className="mt-2 min-h-20 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Optional comma-separated ObjectIds" /></label><ActionError error={mutation.error} /><button type="submit" disabled={mutation.isPending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"><Plus className="h-4 w-4" />{mutation.isPending ? 'Saving...' : 'Add day'}</button></div>
        </form>
      </div>
      <FormActions isSaving={false} onClose={onClose} submitLabel="Done" submitType="button" />
    </div>
  );
}

function RecordForm({ moduleKey, row, action, onClose, onRefresh }: { moduleKey: AdminResourceKey; row?: ApiRecord; action?: string; onClose: () => void; onRefresh: () => void }) {
  const isEdit = !!row && action !== 'delete';
  const isAgent = moduleKey === 'agents';
  const isExercise = moduleKey === 'exercises' || moduleKey === 'videos';
  const isRevenueModel = moduleKey === 'revenueModels';
  const endpoint = isRevenueModel ? '/admin/revenue-models' : isAgent ? '/agents' : isExercise ? '/exercises' : '/programs';
  const objectId = recordObjectId(row);
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      if (action === 'delete' && row) return apiClient.delete(`${endpoint}/${objectId}`);
      const payload = isRevenueModel ? { revenueModel: form.get('revenueModel'), approvedPatientFee: Number(form.get('approvedPatientFee') || 0), feeSharePercentage: Number(form.get('feeSharePercentage') || 0), feeShareType: form.get('feeShareType') || 'percentage', fixedFeeShareAmount: Number(form.get('fixedFeeShareAmount') || 0), feeShareCalculationBasis: form.get('feeShareCalculationBasis') || 'gross', feeShareHoldingDays: Number(form.get('feeShareHoldingDays') || 15), minWithdrawal: Number(form.get('minWithdrawal') || 0), maxWithdrawal: Number(form.get('maxWithdrawal') || 0), payoutCycle: form.get('payoutCycle') || undefined, reason: form.get('reason') || undefined } : isExercise ? { name: form.get('name'), description: form.get('description') || undefined, videoUrl: form.get('videoUrl') || undefined, sets: Number(form.get('sets') || 0), repetitions: Number(form.get('repetitions') || 0), language: form.get('language') || 'en' } : { name: form.get('name'), programCode: form.get('programCode') || undefined, durationDays: Number(form.get('durationDays') || 1), sessionsPerDay: Number(form.get('sessionsPerDay') || 1), difficultyLevel: form.get('difficultyLevel') || undefined, defaultPrice: Number(form.get('defaultPrice') || 0) };
      if (isRevenueModel) return apiClient.patch(`${endpoint}/${objectId}`, payload);
      return isEdit ? apiClient.put(`${endpoint}/${objectId}`, payload) : apiClient.post(endpoint, payload);
    },
    onSuccess: () => { onRefresh(); onClose(); },
  });

  if (isAgent && action !== 'delete') return <AgentRecordForm row={row} onCancel={onClose} onSaved={() => { onRefresh(); onClose(); }} submitLabel={isEdit ? 'Save changes' : 'Create agent'} />;
  if (action === 'delete' && row) return <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); mutation.mutate(new FormData(e.currentTarget)); }}><DecisionNotice title={isAgent ? 'Terminate agent account' : 'Deactivate exercise/video'} /><RecordSummary row={row} fields={isAgent ? ['agentId', 'fullName', 'mobile', 'email', 'status'] : ['name', 'youtubeVideoId', 'language', 'isActive']} /><ActionError error={mutation.error} /><FormActions isSaving={mutation.isPending} onClose={onClose} submitLabel={isAgent ? 'Terminate agent' : 'Deactivate record'} danger /></form>;
  if (isRevenueModel) return <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); mutation.mutate(new FormData(e.currentTarget)); }}><DecisionNotice title="Commercial configuration update" /><RecordSummary row={row ?? {}} fields={['doctorId', 'fullName', 'clinicName', 'status', 'revenueModel']} /><div className="grid gap-4 sm:grid-cols-2"><Select name="revenueModel" label="Revenue model" defaultValue={displayValue(row?.revenueModel ?? 'split')} options={[["split", "Split Model"], ["platform_fee", "Platform Fee Model"]]} /><Input name="approvedPatientFee" label="Approved patient/platform fee" type="number" defaultValue={displayValue(row?.approvedPatientFee ?? row?.requestedPatientFee ?? 0)} /><Input name="feeSharePercentage" label="Fee-share percentage" type="number" defaultValue={displayValue(row?.feeSharePercentage ?? 0)} /><Select name="feeShareType" label="Fee-share type" defaultValue={displayValue(row?.feeShareType ?? 'percentage')} options={[["percentage", "Percentage"], ["fixed", "Fixed"], ["slab", "Slab"]]} /><Input name="fixedFeeShareAmount" label="Fixed fee-share amount" type="number" defaultValue={displayValue(row?.fixedFeeShareAmount ?? 0)} /><Select name="feeShareCalculationBasis" label="Calculation basis" defaultValue={displayValue(row?.feeShareCalculationBasis ?? 'gross')} options={[["gross", "Gross"], ["after_discount", "After discount"], ["net_after_charges", "Net after charges"]]} /><Input name="feeShareHoldingDays" label="Holding days" type="number" defaultValue={displayValue(row?.feeShareHoldingDays ?? 15)} /><Input name="minWithdrawal" label="Minimum withdrawal" type="number" defaultValue={displayValue(row?.minWithdrawal ?? 0)} /><Input name="maxWithdrawal" label="Maximum withdrawal" type="number" defaultValue={displayValue(row?.maxWithdrawal ?? 0)} /><Input name="payoutCycle" label="Payout cycle" defaultValue={displayValue(row?.payoutCycle)} placeholder="monthly" /><label className="block sm:col-span-2"><span className="text-sm font-semibold text-neutral-700">Reason for audit</span><textarea name="reason" required className="mt-2 min-h-24 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Why this commercial configuration is changing" /></label></div><ActionError error={mutation.error} /><FormActions isSaving={mutation.isPending} onClose={onClose} submitLabel="Save revenue model" /></form>;

  return <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); mutation.mutate(new FormData(e.currentTarget)); }}><DecisionNotice title={isExercise ? 'Exercise and YouTube video record' : 'Rehabilitation program record'} /><div className="space-y-5">{isExercise ? <><Input name="name" label="Exercise title" defaultValue={displayValue(row?.name)} required wide /><Input name="videoUrl" label="YouTube unlisted URL" defaultValue={displayValue(row?.videoUrl)} placeholder="https://youtu.be/abcdefghijk" wide /><Input name="sets" label="Sets" type="number" defaultValue={displayValue(row?.sets ?? 3)} /><Input name="repetitions" label="Repetitions" type="number" defaultValue={displayValue(row?.repetitions ?? 10)} /><Select name="language" label="Language" defaultValue={displayValue(row?.language ?? 'en')} options={[["en", "English"], ["hi", "Hindi"]]} /><label className="block sm:col-span-2"><span className="text-sm font-semibold text-neutral-700">Clinical instructions</span><textarea name="description" defaultValue={displayValue(row?.description)} className="mt-2 min-h-24 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" /></label></> : <><Input name="name" label="Program name" defaultValue={displayValue(row?.name)} required wide /><Input name="programCode" label="Program code" defaultValue={displayValue(row?.programCode)} /><Input name="durationDays" label="Duration days" type="number" defaultValue={displayValue(row?.durationDays ?? 14)} required /><Input name="sessionsPerDay" label="Sessions per day" type="number" defaultValue={displayValue(row?.sessionsPerDay ?? 1)} /><Input name="defaultPrice" label="Default price" type="number" defaultValue={displayValue(row?.defaultPrice ?? 0)} /><Select name="difficultyLevel" label="Difficulty" defaultValue={displayValue(row?.difficultyLevel ?? 'beginner')} options={[["beginner", "Beginner"], ["intermediate", "Intermediate"], ["advanced", "Advanced"], ["senior_friendly", "Senior-friendly"], ["post_operative", "Post-operative"], ["general_mobility", "General mobility"], ["condition_specific", "Condition-specific"]]} /></>}</div><ActionError error={mutation.error} /><FormActions isSaving={mutation.isPending} onClose={onClose} submitLabel={isEdit ? 'Save changes' : 'Create record'} /></form>;
}

function useDecisionMutation(endpoint: string, method: 'patch' | 'post', onClose: () => void, onRefresh: () => void) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (payload: ApiRecord) => method === 'patch' ? apiClient.patch(endpoint, payload) : apiClient.post(endpoint, payload), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['admin-resource-page'] }); onRefresh(); onClose(); } });
}

function formPayload(event: React.FormEvent<HTMLFormElement>, options: { status: string; noteField: string }) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  return { status: options.status, [options.noteField]: form.get(options.noteField) || form.get('note') };
}

function RecordPreview({ row, config }: { row: ApiRecord; config: AdminResourceConfig }) {
  const fields = ['_id', config.idField, config.primaryField, ...config.secondaryFields, config.statusField, config.ownerField, config.amountField, config.dateField].filter(Boolean) as string[];
  return <RecordSummary row={row} fields={fields} />;
}

function RecordSummary({ row, fields }: { row: ApiRecord; fields: string[] }) {
  return <div className="grid gap-3 sm:grid-cols-2">{fields.map((field) => <div key={field} className="rounded-lg border border-neutral-200 bg-white p-3"><div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{field}</div><div className="mt-1 break-words text-sm font-semibold text-neutral-900">{displayValue(getValue(row, field))}</div></div>)}</div>;
}

function DecisionNotice({ title }: { title: string }) {
  return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{title}</div>;
}

function StatusCard({ label, value }: { label: string; value: unknown }) {
  return <div className="rounded-lg border border-neutral-200 bg-white p-3"><div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{label}</div><div className="mt-2"><StatusPill value={value} /></div></div>;
}

function StatusPill({ value }: { value: unknown }) {
  const label = displayValue(value);
  const normalized = label.toLowerCase();
  const tone = normalized.includes('approved') || normalized.includes('active') || normalized.includes('success') || normalized.includes('paid') || normalized === 'true' ? 'bg-emerald-50 text-emerald-700' : normalized.includes('pending') || normalized.includes('review') || normalized.includes('processing') || normalized.includes('submitted') ? 'bg-amber-50 text-amber-700' : normalized.includes('failed') || normalized.includes('reject') || normalized.includes('suspend') || normalized.includes('refund') || normalized === 'false' || normalized.includes('block') ? 'bg-rose-50 text-rose-700' : 'bg-neutral-100 text-neutral-600';
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize', tone)}>{label}</span>;
}

function Input({ name, label, type = 'text', defaultValue, placeholder, required, wide }: { name: string; label: string; type?: string; defaultValue?: string; placeholder?: string; required?: boolean; wide?: boolean }) {
  return <label className={cn('block', wide && 'sm:col-span-2')}><span className="text-sm font-semibold text-neutral-700">{label}{required && <span className="ml-0.5 text-rose-500">*</span>}</span><input name={name} type={type} required={required} defaultValue={defaultValue === '-' ? '' : defaultValue} placeholder={placeholder} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>;
}

function Select({ name, label, defaultValue, options }: { name: string; label: string; defaultValue?: string; options: [string, string][] }) {
  return <label className="block"><span className="text-sm font-semibold text-neutral-700">{label}</span><select name={name} defaultValue={defaultValue} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500">{options.map(([value, labelText]) => <option key={value} value={value}>{labelText}</option>)}</select></label>;
}

function ActionError({ error }: { error: unknown }) {
  if (!error) return null;
  return <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{errorMessage(error)}</div>;
}

function errorMessage(error: unknown) {
  const data = asRecord(asRecord(error).response).data;
  return displayValue(asRecord(data).message || asRecord(error).message || 'Request failed.');
}

function FormActions({ isSaving, onClose, submitLabel, danger, submitType = 'submit' }: { isSaving: boolean; onClose: () => void; submitLabel: string; danger?: boolean; submitType?: 'submit' | 'button' }) {
  return <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700">Cancel</button><button type={submitType} onClick={submitType === 'button' ? onClose : undefined} disabled={isSaving} className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60', danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary-600 hover:bg-primary-700')}>{isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isSaving ? 'Saving...' : submitLabel}</button></div>;
}
