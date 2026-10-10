import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Save } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

type ApiRecord = Record<string, unknown>;

type AgentRecordFormProps = {
  row?: ApiRecord;
  onCancel: () => void;
  onSaved: (record?: unknown) => void | Promise<void>;
  submitLabel?: string;
  className?: string;
};

export function AgentRecordForm({ row, onCancel, onSaved, submitLabel, className }: AgentRecordFormProps) {
  const queryClient = useQueryClient();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isEdit = Boolean(row);
  const joiningDateDefault = isEdit ? dateInputValue(row?.joiningDate) : todayInputValue();

  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const errors = validateAgentForm(form);
      if (errors) {
        setFieldErrors(errors);
        throw new Error(Object.values(errors)[0]);
      }

      setFieldErrors({});
      const payload = buildAgentPayload(form, row);
      if (isEdit) return apiClient.put(`/agents/${recordMutationId(row)}`, payload);
      return apiClient.post('/agents', payload);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-agent'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-resource-page'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-detail', 'agent'] });
      await onSaved(response.data);
    },
  });

  return (
    <form
      className={cn('space-y-5', className)}
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate(new FormData(event.currentTarget));
      }}
    >
      <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-neutral-500">Profile details</h3>
        <p className="mb-4 text-xs text-neutral-500">
          Fields marked <span className="font-bold text-rose-500">*</span> are required.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <AgentInput name="fullName" label="Full name" defaultValue={recordText(row, 'fullName')} required error={fieldErrors.fullName} />
          <AgentInput name="mobile" label="Mobile number" defaultValue={recordText(row, 'mobile')} required placeholder="10-15 digit number" error={fieldErrors.mobile} />
          <AgentInput name="email" label="Email address" type="email" defaultValue={recordText(row, 'email')} error={fieldErrors.email} />
          <AgentInput name="whatsapp" label="WhatsApp number" defaultValue={recordText(row, 'whatsapp')} error={fieldErrors.whatsapp} />
          <AgentInput name="joiningDate" label="Joining date" type="date" defaultValue={joiningDateDefault} />
          <AgentInput name="assignedRegion" label="Assigned region" defaultValue={recordText(row, 'assignedRegion')} placeholder="e.g. Indore East" />
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-neutral-500">Location</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <AgentInput name="city" label="City" defaultValue={recordText(row, 'city')} />
          <AgentInput name="state" label="State" defaultValue={recordText(row, 'state')} />
          <AgentInput name="reportingPerson" label="Reporting person" defaultValue={recordText(row, 'reportingPerson')} />
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-neutral-500">Operations</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <AgentInput name="monthlyOnboardingTarget" type="number" label="Monthly doctor onboarding target" defaultValue={recordText(row, 'monthlyOnboardingTarget')} placeholder="Optional" />
          <AgentTextArea name="address" label="Address" defaultValue={recordText(row, 'address')} />
        </div>
        <p className="mt-3 text-xs text-neutral-500">New accounts start active and must change their temporary password at first login. For suspension or termination, use the secure status controls on the agent detail page. File uploads require the dedicated document workflow.</p>
      </section>

      {mutation.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          {formErrorMessage(mutation.error)}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={mutation.isPending}
          leftIcon={mutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        >
          {mutation.isPending ? 'Saving...' : submitLabel ?? (isEdit ? 'Save changes' : 'Create agent')}
        </Button>
      </div>
    </form>
  );
}

function AgentInput({
  name,
  label,
  type = 'text',
  defaultValue,
  placeholder,
  required,
  error,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-700">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={cn(
          'mt-2 w-full rounded-lg border px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500',
          error ? 'border-rose-400 bg-rose-50' : 'border-neutral-300',
        )}
      />
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </label>
  );
}

function AgentTextArea({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={4}
        className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
      />
    </label>
  );
}

function recordText(row: ApiRecord | undefined, field: string) {
  const value = row?.[field];
  if (value === undefined || value === null || value === '' || value === '-') return '';
  return String(value);
}

function dateInputValue(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function todayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function recordMutationId(row: ApiRecord | undefined) {
  return String(row?._id || row?.id || '');
}

function validateAgentForm(form: FormData) {
  const errs: Record<string, string> = {};
  const fullName = String(form.get('fullName') || '').trim();
  const mobile = String(form.get('mobile') || '').trim();
  const email = String(form.get('email') || '').trim();
  const whatsapp = String(form.get('whatsapp') || '').trim();
  const target = String(form.get('monthlyOnboardingTarget') || '').trim();

  if (!fullName) errs.fullName = 'Full name is required.';
  else if (fullName.length < 2) errs.fullName = 'Full name must be at least 2 characters.';
  if (!mobile) errs.mobile = 'Mobile number is required.';
  else if (!/^\+?\d{10,15}$/.test(mobile)) errs.mobile = 'Enter a valid 10-15 digit mobile number.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address.';
  if (whatsapp && !/^\+?\d{10,15}$/.test(whatsapp)) errs.whatsapp = 'Enter a valid 10-15 digit WhatsApp number.';
  if (target && (!/^\d+$/.test(target) || Number(target) > 10000)) errs.monthlyOnboardingTarget = 'Enter a whole number from 0 to 10000.';

  return Object.keys(errs).length ? errs : null;
}

function buildAgentPayload(form: FormData, row: ApiRecord | undefined) {
  const isEdit = Boolean(row);
  const target = requiredText(form, 'monthlyOnboardingTarget');
  const payload: ApiRecord = {
    fullName: requiredText(form, 'fullName'),
    mobile: requiredText(form, 'mobile'),
    whatsapp: optionalText(form, 'whatsapp', isEdit),
    email: optionalText(form, 'email', isEdit),
    address: optionalText(form, 'address', isEdit),
    city: optionalText(form, 'city', isEdit),
    state: optionalText(form, 'state', isEdit),
    assignedRegion: optionalText(form, 'assignedRegion', isEdit),
    reportingPerson: optionalText(form, 'reportingPerson', isEdit),
    joiningDate: optionalText(form, 'joiningDate', isEdit),
    monthlyOnboardingTarget: target ? Number(target) : null,
  };

  return removeUndefined(payload);
}

function requiredText(form: FormData, field: string) {
  return String(form.get(field) || '').trim();
}

function optionalText(form: FormData, field: string, isEdit: boolean) {
  const value = String(form.get(field) || '').trim();
  return value || (isEdit ? '' : undefined);
}

function removeUndefined(payload: ApiRecord) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function formErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message || (error as { message?: unknown }).message;
    if (message) return String(message);
  }
  return 'Agent update failed. Check validation and try again.';
}
