import type { ReactNode } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import type { AdminResourceConfig } from '@/features/admin/resources';

function createButtonLabel(createKind?: AdminResourceConfig['createKind']) {
  if (createKind === 'agent') return 'Add agent';
  if (createKind === 'program') return 'Create program';
  return 'Add exercise/video';
}

export function AdminResourceHeader({
  config,
  onCreate,
  onRefresh,
  auditAction,
}: {
  config: AdminResourceConfig;
  onCreate?: () => void;
  onRefresh: () => void;
  auditAction?: ReactNode;
}) {
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-teal-700">
          <Icon className="h-3.5 w-3.5" />
          {config.eyebrow}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-neutral-900 sm:text-3xl">{config.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">{config.description}</p>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
        {auditAction}
        {config.createKind && onCreate && (
          <button type="button" onClick={onCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
            <Plus className="h-4 w-4" />
            {createButtonLabel(config.createKind)}
          </button>
        )}
        <button type="button" onClick={onRefresh} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
    </div>
  );
}
