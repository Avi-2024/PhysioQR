import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';

type Region = {
  _id: string; name: string; isActive: boolean;
  assessmentVisibility: { general: boolean; postOperative: boolean };
};
type Surgery = {
  _id: string; code: string; name: string; isActive: boolean;
  assessmentPublished: boolean; bodyRegion?: { _id: string; name: string; isActive: boolean };
};
type VisibilityChange = {
  kind: 'region' | 'surgery';
  id: string; name: string; pathway?: 'general' | 'postOperative'; visible: boolean;
};
type Props = { bodyRegions: Region[]; surgeryTypes: Surgery[]; isLoading: boolean };
const actionButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40';

export default function AssessmentPublicationManager({ bodyRegions, surgeryTypes, isLoading }: Props) {
  const qc = useQueryClient();
  const [change, setChange] = useState<VisibilityChange | null>(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');

  const mutation = useMutation({
    mutationFn: async (payload: VisibilityChange & { reason: string }) => {
      const path = payload.kind === 'region'
        ? `/admin/assessment-pathways/body-regions/${payload.id}/visibility`
        : `/admin/assessment-pathways/surgery-types/${payload.id}/visibility`;
      return apiClient.patch(path, {
        visible: payload.visible,
        reason: payload.reason,
        ...(payload.kind === 'region' ? { pathway: payload.pathway } : {}),
      });
    },
    onSuccess: async (_response, payload) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin-assessment-pathways'] }),
        qc.invalidateQueries({ queryKey: ['assessment-pathways'] }),
        qc.invalidateQueries({ queryKey: ['assessment-surgery-types'] }),
      ]);
      setNotice(`${payload.name} ${payload.visible ? 'is now shown' : 'is now hidden'} for new patient assessments.`);
      setChange(null);
      setReason('');
    },
  });

  const openChange = (action: VisibilityChange) => {
    mutation.reset();
    setNotice('');
    setReason('');
    setChange(action);
  };
  const close = () => {
    if (mutation.isPending) return;
    setChange(null);
    setReason('');
  };

  const generalCount = bodyRegions.filter((region) => region.isActive && region.assessmentVisibility.general).length;
  const postCount = bodyRegions.filter((region) => region.isActive && region.assessmentVisibility.postOperative
    && surgeryTypes.some((surgery) => surgery.isActive && surgery.assessmentPublished && surgery.bodyRegion?._id === region._id)).length;
  const surgeryCount = surgeryTypes.filter((surgery) => surgery.isActive && surgery.assessmentPublished
    && surgery.bodyRegion?.isActive && bodyRegions.some((region) =>
      region._id === surgery.bodyRegion?._id && region.assessmentVisibility.postOperative)).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm" aria-labelledby="patient-visibility-heading">
      <header className="border-b border-emerald-100 bg-emerald-50/60 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Patient-facing controls</p>
        <h2 id="patient-visibility-heading" className="mt-1 text-xl font-bold text-neutral-950">What can patients select?</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-700">
          Use these switches to decide which body regions and surgeries appear in NEW patient assessments.
          Hidden options stay safely in the database and can be enabled later without changing code.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-lg border border-emerald-200 bg-white px-3 py-2">General: {generalCount} visible</span>
          <span className="rounded-lg border border-emerald-200 bg-white px-3 py-2">Post-op: {postCount} regions</span>
          <span className="rounded-lg border border-emerald-200 bg-white px-3 py-2">Post-op: {surgeryCount} surgery types</span>
        </div>
      </header>

      {notice && <p role="status" className="mx-5 mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
        <CheckCircle2 className="h-4 w-4" />{notice}
      </p>}

      <div className="p-5">
        <h3 className="text-base font-bold text-neutral-900">1. Choose body regions</h3>
        <p className="mt-1 text-sm text-neutral-500">
          General means pain/injury. Post-op means rehabilitation after surgery. These are separate settings.
        </p>
        {isLoading ? <p className="mt-5 text-sm text-neutral-500">Loading publication settings…</p> : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr><th className="px-4 py-3">Body region</th><th className="px-4 py-3">General assessment</th><th className="px-4 py-3">Post-operative assessment</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {bodyRegions.map((region) => (
                  <tr key={region._id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-neutral-900">{region.name}</div>
                      {!region.isActive && <div className="mt-1 text-xs text-amber-700">Inactive globally — activate it first</div>}
                    </td>
                    {(['general', 'postOperative'] as const).map((pathway) => {
                      const visible = Boolean(region.assessmentVisibility[pathway]);
                      return <td key={pathway} className="px-4 py-3">
                        <button type="button"
                          disabled={!region.isActive}
                          onClick={() => openChange({ kind: 'region', id: region._id, name: region.name, pathway, visible: !visible })}
                          className={`${actionButton} ${visible
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100'}`}
                          aria-label={`${visible ? 'Hide' : 'Show'} ${region.name} in ${pathway === 'general' ? 'General' : 'Post-op'} assessments`}
                          aria-pressed={visible}
                        >
                          {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          {!region.isActive && visible ? 'Saved as shown (inactive)' : visible ? 'Shown — click to hide' : 'Hidden — click to show'}
                        </button>
                      </td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="border-t border-neutral-100 p-5">
        <h3 className="text-base font-bold text-neutral-900">2. Choose post-operative surgeries</h3>
        <p className="mt-1 text-sm leading-6 text-neutral-500">
          Only published surgeries appear. Both the surgery and its body region must be active, and the region must be shown in Post-op assessments.
        </p>
        {isLoading ? <p className="mt-4 text-sm text-neutral-500">Loading surgery choices…</p> : (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {surgeryTypes.map((surgery) => {
              const region = bodyRegions.find((item) => item._id === surgery.bodyRegion?._id);
              const enabled = Boolean(surgery.isActive && surgery.bodyRegion?.isActive && region?.assessmentVisibility.postOperative);
              return (
                <div key={surgery._id} className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900">{surgery.name}</p>
                    <p className="mt-1 text-xs text-neutral-500">{surgery.bodyRegion?.name || 'Unassigned body region'}</p>
                    {!enabled && <p className="mt-1 text-xs text-amber-700">Enable the body region in Post-op (and activate records) first</p>}
                  </div>
                  <button type="button" disabled={!surgery.isActive || (!enabled && !surgery.assessmentPublished)}
                    onClick={() => openChange({ kind: 'surgery', id: surgery._id, name: surgery.name, visible: !surgery.assessmentPublished })}
                    className={`${actionButton} shrink-0 ${surgery.assessmentPublished
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100'}`}
                    aria-pressed={surgery.assessmentPublished}
                    aria-label={`${surgery.assessmentPublished ? 'Hide' : 'Show'} surgery ${surgery.name}`}
                  >
                    {surgery.assessmentPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {surgery.assessmentPublished ? (enabled ? 'Shown — hide' : 'Enabled (region hidden)') : 'Hidden — show'}
                  </button>
                </div>
              );
            })}
            {!surgeryTypes.length && <p className="text-sm text-neutral-500">No surgery types are configured yet.</p>}
          </div>
        )}
      </div>

      <div className="flex gap-3 border-t border-amber-100 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <p><strong>Before publishing:</strong> clinical team should approve the assessment questions, programme-day exercises, videos and safety instructions. Showing a region does not create its rehabilitation videos or bypass clinical review.</p>
      </div>

      <Modal isOpen={change !== null} onClose={close} title={change?.visible ? 'Show this option to patients?' : 'Hide this option from patients?'} size="md">
        <div className="space-y-4 pt-3">
          <p className="text-sm leading-6 text-neutral-700">
            <strong>{change?.name}</strong> will be {change?.visible ? 'shown' : 'hidden'} in
            {change?.kind === 'region'
              ? ` ${change?.pathway === 'general' ? 'General' : 'Post-operative'} assessment`
              : ' Post-operative surgery choices'} for new registrations.
            Existing patient assessments will not be deleted.
          </p>
          {change?.visible && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Publish only after your clinical team has approved the pathway and its rehabilitation content.</p>}
          <label className="block text-sm font-semibold text-neutral-800">
            Why are you making this change? <span className="text-rose-600">*</span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500}
              placeholder="e.g. Approved Phase 1 knee rehabilitation pathway"
              className="mt-2 block min-h-24 w-full resize-y rounded-lg border border-neutral-300 p-3 text-sm font-normal"
            />
            <span className="mt-1 block text-xs font-normal text-neutral-500">Minimum 5 characters. The reason is saved in the audit log.</span>
          </label>
          {mutation.isError && <p role="alert" className="text-sm text-rose-700">{errorMessage(mutation.error)}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" disabled={mutation.isPending} onClick={close} className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700">Cancel</button>
            <button type="button"
              disabled={mutation.isPending || reason.trim().length < 5 || !change}
              onClick={() => { if (change) mutation.mutate({ ...change, reason: reason.trim() }); }}
              className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >{mutation.isPending ? 'Saving…' : change?.visible ? 'Confirm: Show to patients' : 'Confirm: Hide from patients'}</button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function errorMessage(error: unknown) {
  const parsed = error as { response?: { data?: { message?: string } }; message?: string } | null;
  return parsed?.response?.data?.message || parsed?.message || 'Could not update assessment visibility. Please retry.';
}
