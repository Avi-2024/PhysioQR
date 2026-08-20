import { cn } from '@/lib/cn';

export const doctorStatusFilters: [string, string][] = [
  ['', 'All'],
  ['submitted', 'Submitted'],
  ['under_review', 'Under review'],
  ['documents_required', 'Docs required'],
  ['approved', 'Approved'],
  ['suspended', 'Suspended'],
  ['rejected', 'Rejected'],
];

const doctorRevenueFilters: [string, string][] = [
  ['', 'All models'],
  ['split', 'Split'],
  ['platform_fee', 'Platform fee'],
];

export function normalizeDoctorStatusFilter(value: string | null) {
  if (!value || value === 'all') return '';
  if (value === 'pending') return 'submitted';
  return value;
}

export function DoctorResourceFilters({
  status,
  revenueModel,
  onChange,
  onReset,
}: {
  status: string;
  revenueModel: string;
  onChange: (key: 'status' | 'revenueModel', value: string) => void;
  onReset: () => void;
}) {
  const normalizedStatus = normalizeDoctorStatusFilter(status);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-bold text-neutral-900">Doctor workflow filters</h2>
          <p className="mt-1 text-xs text-neutral-500">Filters are sent to the backend `/admin/doctors` API.</p>
        </div>
        <button type="button" onClick={onReset} className="self-start rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 lg:self-auto">
          Reset filters
        </button>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex flex-wrap gap-2">
          {doctorStatusFilters.map(([value, label]) => (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => onChange('status', value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                normalizedStatus === value
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:bg-primary-50 hover:text-primary-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-neutral-400">Revenue model</span>
          <select
            value={revenueModel}
            onChange={(event) => onChange('revenueModel', event.target.value)}
            className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
          >
            {doctorRevenueFilters.map(([value, label]) => (
              <option key={value || 'all-models'} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
