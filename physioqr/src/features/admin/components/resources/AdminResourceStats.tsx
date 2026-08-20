import { cn } from '@/lib/cn';

type ResourceStats = {
  total: number;
  active: number;
  pending: number;
};

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: 'teal' | 'emerald' | 'amber' | 'sky';
}) {
  const toneClass =
    tone === 'teal'
      ? 'bg-teal-50 text-teal-700'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-700'
        : tone === 'amber'
          ? 'bg-amber-50 text-amber-700'
          : 'bg-sky-50 text-sky-700';

  return (
    <div className="card p-4">
      <div className={cn('mb-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold', toneClass)}>
        {label}
      </div>
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
    </div>
  );
}

export function AdminResourceStats({ stats }: { stats: ResourceStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <KpiCard label="Total records" value={stats.total} tone="teal" />
      <KpiCard label="Active" value={stats.active} tone="emerald" />
      <KpiCard label="Pending review" value={stats.pending} tone="amber" />
      <KpiCard label="Data source" value="Live API" tone="sky" />
    </div>
  );
}
