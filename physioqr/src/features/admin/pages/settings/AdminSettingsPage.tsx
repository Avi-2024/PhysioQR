import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CircleDollarSign, HeartPulse, Save, Settings2, ShieldCheck } from 'lucide-react';
import ErrorState from '@/components/feedback/ErrorState';
import apiClient from '@/lib/api-client';

type PlatformSettings = { supportEmail: string; supportPhone: string; maintenanceMode: boolean };
type PatientSettings = { assessmentRequired: boolean; redFlagReviewRequired: boolean };
type FinanceSettings = { currency: 'INR'; paymentsEnabled: boolean; refundsEnabled: boolean; withdrawalsEnabled: boolean };
type NotificationSettings = { inAppEnabled: boolean; webPushEnabled: boolean; emailEnabled: boolean; smsEnabled: boolean; whatsappEnabled: boolean };
type SettingsPayload = { settings: { platform: PlatformSettings; patient: PatientSettings; finance: FinanceSettings; notifications: NotificationSettings }; metadata: Record<string, { updatedAt?: string; updatedBy?: { email?: string; mobile?: string } }> };
type Section = keyof SettingsPayload['settings'];

const sectionMeta = {
  platform: { title: 'Platform', description: 'Support contacts and platform availability controls.', icon: Settings2 },
  patient: { title: 'Patient safety', description: 'Controls that protect the assessment and red-flag flow.', icon: HeartPulse },
  finance: { title: 'Finance controls', description: 'Runtime availability controls for payment, refund and withdrawal initiation.', icon: CircleDollarSign },
  notifications: { title: 'Notification channels', description: 'Choose which delivery channels are available to the platform.', icon: Bell },
} as const;

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-start justify-between gap-5 rounded-xl border border-neutral-200 bg-white p-4"><span><span className="block text-sm font-semibold text-neutral-900">{label}</span><span className="mt-1 block text-xs leading-5 text-neutral-500">{description}</span></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-600" /></label>;
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin-settings'], queryFn: async () => (await apiClient.get('/admin/settings')).data as SettingsPayload });
  const [draft, setDraft] = useState<SettingsPayload['settings'] | null>(null);
  const [reason, setReason] = useState<Record<Section, string>>({ platform: '', patient: '', finance: '', notifications: '' });

  useEffect(() => { if (query.data?.settings) setDraft(query.data.settings); }, [query.data]);

  const mutation = useMutation({
    mutationFn: async ({ section, value }: { section: Section; value: Record<string, unknown> }) => (await apiClient.patch(`/admin/settings/${section}`, value)).data,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['admin-settings'] }); },
  });

  if (query.isLoading || !draft) return <div className="space-y-4"><div className="h-24 animate-pulse rounded-2xl bg-neutral-100" /><div className="h-72 animate-pulse rounded-2xl bg-neutral-100" /></div>;
  if (query.isError) return <ErrorState title="Settings unavailable" message="The platform settings could not be loaded." onRetry={() => query.refetch()} />;

  const save = (section: Section) => mutation.mutate({ section, value: { ...draft[section], reason: reason[section] || undefined } });
  const meta = query.data?.metadata || {};

  return <div className="space-y-6">
    <header className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-start gap-3"><div className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Platform governance</p><h1 className="mt-1 text-2xl font-bold text-neutral-950">Settings</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">Manage only platform-wide controls that have a real backend contract. Secrets, provider credentials, clinical content and doctor-specific commercial rules stay in their owning modules.</p></div></div>
    </header>

    {(Object.keys(sectionMeta) as Section[]).map((section) => {
      const info = sectionMeta[section]; const Icon = info.icon; const updated = meta[section];
      return <section key={section} className="rounded-2xl border border-neutral-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-neutral-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="rounded-lg bg-neutral-100 p-2 text-neutral-700"><Icon className="h-4 w-4" /></div><div><h2 className="font-semibold text-neutral-950">{info.title}</h2><p className="mt-1 text-sm text-neutral-500">{info.description}</p>{updated?.updatedAt && <p className="mt-1 text-xs text-neutral-400">Last updated {new Date(updated.updatedAt).toLocaleString()} {updated.updatedBy?.email ? `by ${updated.updatedBy.email}` : ''}</p>}</div></div><button type="button" disabled={mutation.isPending} onClick={() => save(section)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />Save section</button></div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {section === 'platform' && <><label className="text-sm font-medium text-neutral-700">Support email<input value={draft.platform.supportEmail} onChange={(e) => setDraft({ ...draft, platform: { ...draft.platform, supportEmail: e.target.value } })} className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-500" placeholder="support@company.com" /></label><label className="text-sm font-medium text-neutral-700">Support phone<input value={draft.platform.supportPhone} onChange={(e) => setDraft({ ...draft, platform: { ...draft.platform, supportPhone: e.target.value } })} className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-500" placeholder="Support number" /></label><div className="md:col-span-2"><Toggle label="Maintenance mode" description="Runtime traffic guard. Admin, auth, health and payment webhooks remain available for safe recovery and reconciliation." checked={draft.platform.maintenanceMode} onChange={(v) => setDraft({ ...draft, platform: { ...draft.platform, maintenanceMode: v } })} /></div></>}
          {section === 'patient' && <><Toggle label="Assessment required" description="Keep the common assessment as a required patient onboarding control." checked={draft.patient.assessmentRequired} onChange={(v) => setDraft({ ...draft, patient: { ...draft.patient, assessmentRequired: v } })} /><Toggle label="Red-flag review required" description="Preserve manual clinical review for assessments that contain red flags." checked={draft.patient.redFlagReviewRequired} onChange={(v) => setDraft({ ...draft, patient: { ...draft.patient, redFlagReviewRequired: v } })} /></>}
          {section === 'finance' && <><label className="text-sm font-medium text-neutral-700">Currency<input value={draft.finance.currency} disabled className="mt-2 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 font-normal text-neutral-500" /></label><div /><Toggle label="New payments enabled" description="Controls new Razorpay order creation. Verification and webhooks remain available for payment attempts already in flight." checked={draft.finance.paymentsEnabled} onChange={(v) => setDraft({ ...draft, finance: { ...draft.finance, paymentsEnabled: v } })} /><Toggle label="Refund creation enabled" description="Controls creation of new refund records. Existing refund history remains readable." checked={draft.finance.refundsEnabled} onChange={(v) => setDraft({ ...draft, finance: { ...draft.finance, refundsEnabled: v } })} /><Toggle label="New withdrawals enabled" description="Controls new doctor withdrawal requests. Existing requests remain operable so liabilities can still be settled or rejected safely." checked={draft.finance.withdrawalsEnabled} onChange={(v) => setDraft({ ...draft, finance: { ...draft.finance, withdrawalsEnabled: v } })} /></>}
          {section === 'notifications' && <><Toggle label="In-app" description="Allow in-app notification delivery." checked={draft.notifications.inAppEnabled} onChange={(v) => setDraft({ ...draft, notifications: { ...draft.notifications, inAppEnabled: v } })} /><Toggle label="Web Push" description="Allow browser push delivery for subscribed devices." checked={draft.notifications.webPushEnabled} onChange={(v) => setDraft({ ...draft, notifications: { ...draft.notifications, webPushEnabled: v } })} /><Toggle label="Email" description="Allow email notification delivery." checked={draft.notifications.emailEnabled} onChange={(v) => setDraft({ ...draft, notifications: { ...draft.notifications, emailEnabled: v } })} /><Toggle label="SMS" description="Allow SMS notification delivery." checked={draft.notifications.smsEnabled} onChange={(v) => setDraft({ ...draft, notifications: { ...draft.notifications, smsEnabled: v } })} /><Toggle label="WhatsApp" description="Allow WhatsApp notification delivery." checked={draft.notifications.whatsappEnabled} onChange={(v) => setDraft({ ...draft, notifications: { ...draft.notifications, whatsappEnabled: v } })} /></>}
          <label className="text-sm font-medium text-neutral-700 md:col-span-2">Change reason <span className="font-normal text-neutral-400">(recommended for audit context)</span><input value={reason[section]} onChange={(e) => setReason({ ...reason, [section]: e.target.value })} className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-500" placeholder={`Why are you changing ${info.title.toLowerCase()} settings?`} /></label>
        </div>
      </section>;
    })}

    {mutation.isError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Settings could not be saved. No local fallback values were applied.</div>}
    {mutation.isSuccess && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">Settings saved and recorded in the audit trail.</div>}
  </div>;
}
