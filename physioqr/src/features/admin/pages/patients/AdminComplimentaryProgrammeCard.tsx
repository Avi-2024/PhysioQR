import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Gift, PlusCircle, ShieldCheck, X } from 'lucide-react';
import apiClient from '@/lib/api-client';

type EligibleProgramme = {
  _id: string;
  name: string;
  programCode?: string;
  durationDays: number;
  assessmentId: string;
};
type Eligibility = {
  eligible: boolean;
  reason?: string;
  programmes: EligibleProgramme[];
};
type AssignmentToast = { kind: 'success' | 'error'; title: string; message: string };

type Props = {
  patientId: string;
  onAssigned: () => Promise<unknown>;
};

export default function AdminComplimentaryProgrammeCard({ patientId, onAssigned }: Props) {
  const [programmeId, setProgrammeId] = useState('');
  const [clinicalNote, setClinicalNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [toast, setToast] = useState<AssignmentToast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const eligibility = useQuery<Eligibility>({
    queryKey: ['admin-complimentary-programmes', patientId],
    queryFn: () => apiClient.get(`/admin/patients/${encodeURIComponent(patientId)}/programmes/eligible`).then((response) => response.data),
    enabled: Boolean(patientId),
    retry: false,
  });
  const assignment = useMutation({
    mutationFn: () => apiClient.post(`/admin/patients/${encodeURIComponent(patientId)}/programmes/complimentary`, {
      programId: programmeId,
      clinicalNote: clinicalNote.trim(),
      confirmFree: true,
    }),
    onSuccess: async () => {
      setProgrammeId('');
      setClinicalNote('');
      setConfirmed(false);
      setToast({
        kind: 'success',
        title: 'Programme assigned successfully',
        message: 'Additional rehabilitation programme added free (₹0). Previous progress is preserved.',
      });
      // The successful assignment must not be reported as failed merely because
      // a follow-up dashboard refresh is unavailable.
      await Promise.allSettled([eligibility.refetch(), onAssigned()]);
    },
    onError: (error: any) => {
      setToast({
        kind: 'error',
        title: 'Programme could not be assigned',
        message: error?.response?.data?.message || 'Check clinical eligibility and approved programme videos, then try again.',
      });
    },
  });

  const options = eligibility.data?.programmes || [];
  const selected = options.find((item) => item._id === programmeId);
  const canSubmit = Boolean(selected && clinicalNote.trim().length >= 10 && confirmed && !assignment.isPending);

  return (
    <section aria-label="Assign free additional programme" className="overflow-hidden rounded-xl border border-emerald-200 bg-white">
      <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-4">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <h2 className="text-sm font-bold text-emerald-950">Assign additional programme — Free</h2>
        </div>
        <p className="mt-1 text-xs leading-5 text-emerald-900">
          For an existing paid rehabilitation patient. This adds a separate programme with no new payment or doctor fee share.
        </p>
      </div>
      <div className="space-y-4 p-5">
        {eligibility.isLoading && <p className="text-sm text-neutral-600">Checking clinically eligible programmes…</p>}
        {eligibility.isError && <p role="alert" className="text-sm text-rose-700">
          Could not check programme eligibility. <button type="button" onClick={() => eligibility.refetch()} className="font-semibold underline">Retry</button>
        </p>}
        {eligibility.data && !eligibility.data.eligible && <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          {eligibility.data.reason}
        </div>}
        {eligibility.data?.eligible && !options.length && <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm leading-6 text-neutral-700">
          No additional clinically eligible, video-ready programmes are available. Check the patient's assessments, published programme and Day 1 exercise videos.
        </p>}
        {options.length > 0 && <>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-800">Select programme</span>
            <select value={programmeId} onChange={(event) => { setProgrammeId(event.target.value); setToast(null); }}
              className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm focus:border-emerald-600">
              <option value="">Choose approved programme</option>
              {options.map((item) => <option key={item._id} value={item._id}>{item.name} · {item.durationDays} days</option>)}
            </select>
          </label>
          {selected && <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
            <ShieldCheck className="h-4 w-4" /> Clinically cleared for this body region · ₹0
          </div>}
          <label className="block">
            <span className="text-sm font-semibold text-neutral-800">Clinical assignment note *</span>
            <textarea rows={3} maxLength={1000} value={clinicalNote} onChange={(event) => setClinicalNote(event.target.value)}
              placeholder="Record the clinical rationale and treating professional's guidance (at least 10 characters)"
              className="mt-2 w-full rounded-xl border border-neutral-300 p-3 text-sm leading-6 focus:border-emerald-600" />
            <span className="mt-1 block text-xs text-neutral-500">This note is audit logged with the Admin identity and cleared assessment.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-3">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 h-4 w-4 accent-emerald-700" />
            <span className="text-sm leading-6 text-neutral-700">Confirm this is a <strong>free additional programme (₹0)</strong>. Previous programmes and patient progress will remain unchanged.</span>
          </label>
          <button type="button" disabled={!canSubmit} onClick={() => assignment.mutate()}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            {assignment.isPending ? 'Assigning…' : 'Assign programme free'}
          </button>
        </>}
      </div>
      {toast && createPortal(
        <div
          role={toast.kind === 'error' ? 'alert' : 'status'}
          aria-atomic="true"
          className={`fixed right-4 top-4 z-[100] w-[calc(100vw-2rem)] max-w-sm rounded-xl border bg-white p-4 shadow-xl sm:right-6 sm:top-6 ${
            toast.kind === 'success' ? 'border-emerald-200' : 'border-rose-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {toast.kind === 'success'
              ? <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              : <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-neutral-950">{toast.title}</p>
              <p className="mt-1 text-sm leading-5 text-neutral-600">{toast.message}</p>
            </div>
            <button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}
              className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
}
