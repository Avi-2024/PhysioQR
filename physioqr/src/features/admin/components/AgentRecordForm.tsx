import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Image, RefreshCw, Save, Upload } from 'lucide-react';
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

const STATUS_OPTIONS: [string, string][] = [
  ['active', 'Active'],
  ['inactive', 'Inactive'],
  ['suspended', 'Suspended'],
  ['terminated', 'Terminated'],
];

export function AgentRecordForm({ row, onCancel, onSaved, submitLabel, className }: AgentRecordFormProps) {
  const queryClient = useQueryClient();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isEdit = Boolean(row);
  const profilePhoto = recordText(row, 'profilePhoto');
  const identityProof = recordText(row, 'identityProof');
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
          <AgentFileField
            name="profilePhoto"
            label="Profile photo"
            accept="image/*"
            currentValue={profilePhoto}
            currentLabel="Current profile photo"
            icon={Image}
          />
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-neutral-500">Location</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <AgentInput name="city" label="City" defaultValue={recordText(row, 'city')} />
          <AgentInput name="state" label="State" defaultValue={recordText(row, 'state')} />
          <AgentFileField
            name="identityProof"
            label="Identity proof"
            accept="image/*,.pdf"
            currentValue={identityProof}
            currentLabel="Current identity proof"
            currentUnavailable={isEdit && !identityProof}
            icon={FileText}
            wide
          />
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <AgentSelect name="status" label="Status" defaultValue={recordText(row, 'status') || 'active'} options={STATUS_OPTIONS} />
          <AgentTextArea name="address" label="Address" defaultValue={recordText(row, 'address')} />
        </div>
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

function AgentSelect({ name, label, defaultValue, options }: { name: string; label: string; defaultValue?: string; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <select name={name} defaultValue={defaultValue} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500">
        {options.map(([value, labelText]) => (
          <option key={value} value={value}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function AgentFileField({
  name,
  label,
  accept,
  currentValue,
  currentLabel,
  currentUnavailable,
  icon: Icon,
  wide,
}: {
  name: string;
  label: string;
  accept: string;
  currentValue?: string;
  currentLabel: string;
  currentUnavailable?: boolean;
  icon: React.ElementType;
  wide?: boolean;
}) {
  return (
    <div className={cn('block', wide && 'md:col-span-2')}>
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <div className="mt-2 flex items-center gap-3 rounded-lg border border-dashed border-neutral-300 bg-white px-3 py-2.5">
        <Upload className="h-4 w-4 shrink-0 text-neutral-500" />
        <input
          type="file"
          name={name}
          accept={accept}
          className="block w-full text-sm text-neutral-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary-700"
        />
      </div>
      <CurrentFileState label={currentLabel} value={currentValue} unavailable={currentUnavailable} icon={Icon} />
    </div>
  );
}

function CurrentFileState({ label, value, unavailable, icon: Icon }: { label: string; value?: string; unavailable?: boolean; icon: React.ElementType }) {
  if (!value && !unavailable) return null;

  return (
    <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-neutral-500 ring-1 ring-neutral-200">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{label}</div>
          {value ? (
            <>
              {isPreviewableImage(value) && (
                <img src={value} alt={label} className="mt-2 h-20 w-20 rounded-lg border border-neutral-200 object-cover" />
              )}
              {isOpenablePath(value) ? (
                <a href={value} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs font-semibold text-primary-700 hover:text-primary-800">
                  {value}
                </a>
              ) : (
                <p className="mt-1 truncate text-xs font-semibold text-neutral-700">{value}</p>
              )}
              <p className="mt-1 text-xs text-neutral-500">Current file remains unless a new file is selected.</p>
            </>
          ) : (
            <p className="mt-1 text-xs font-semibold text-neutral-500">Current file is not returned by the admin API. Upload only if replacing it.</p>
          )}
        </div>
      </div>
    </div>
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

  if (!fullName) errs.fullName = 'Full name is required.';
  else if (fullName.length < 2) errs.fullName = 'Full name must be at least 2 characters.';
  if (!mobile) errs.mobile = 'Mobile number is required.';
  else if (!/^\+?\d{10,15}$/.test(mobile)) errs.mobile = 'Enter a valid 10-15 digit mobile number.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address.';
  if (whatsapp && !/^\+?\d{10,15}$/.test(whatsapp)) errs.whatsapp = 'Enter a valid 10-15 digit WhatsApp number.';

  return Object.keys(errs).length ? errs : null;
}

function buildAgentPayload(form: FormData, row: ApiRecord | undefined) {
  const isEdit = Boolean(row);
  const payload: ApiRecord = {
    fullName: requiredText(form, 'fullName'),
    mobile: requiredText(form, 'mobile'),
    whatsapp: optionalText(form, 'whatsapp', isEdit),
    email: optionalText(form, 'email', isEdit),
    address: optionalText(form, 'address', isEdit),
    city: optionalText(form, 'city', isEdit),
    state: optionalText(form, 'state', isEdit),
    joiningDate: optionalText(form, 'joiningDate', isEdit),
    status: requiredText(form, 'status') || 'active',
  };

  const profilePhoto = fileReference(form, 'profilePhoto', recordText(row, 'profilePhoto'));
  const identityProof = fileReference(form, 'identityProof', recordText(row, 'identityProof'));
  if (profilePhoto) payload.profilePhoto = profilePhoto;
  if (identityProof) payload.identityProof = identityProof;

  return removeUndefined(payload);
}

function requiredText(form: FormData, field: string) {
  return String(form.get(field) || '').trim();
}

function optionalText(form: FormData, field: string, isEdit: boolean) {
  const value = String(form.get(field) || '').trim();
  return value || (isEdit ? '' : undefined);
}

function fileReference(form: FormData, field: string, currentValue: string) {
  const value = form.get(field);
  if (value instanceof File && value.size > 0) return value.name;
  return currentValue || undefined;
}

function removeUndefined(payload: ApiRecord) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function isOpenablePath(value: string) {
  return /^(https?:\/\/|\/)/i.test(value);
}

function isPreviewableImage(value: string) {
  if (/^data:image\//i.test(value)) return true;
  return /^(https?:\/\/|\/)/i.test(value) && /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(value);
}

function formErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message || (error as { message?: unknown }).message;
    if (message) return String(message);
  }
  return 'Agent update failed. Check validation and try again.';
}
