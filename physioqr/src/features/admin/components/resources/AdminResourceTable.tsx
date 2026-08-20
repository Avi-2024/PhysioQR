import type { ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import ErrorState from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import type { AdminResourceConfig, ApiRecord } from '@/features/admin/resources';
import { displayValue, formatAmount, formatDate, getRecordId, getValue } from '@/features/admin/resources';
import { cn } from '@/lib/cn';

function StatusPill({ value }: { value: unknown }) {
  const label = displayValue(value);
  const normalized = label.toLowerCase();
  const tone =
    normalized.includes('approved') || normalized.includes('active') || normalized.includes('success') || normalized.includes('paid') || normalized === 'true'
      ? 'bg-emerald-50 text-emerald-700'
      : normalized.includes('pending') || normalized.includes('review') || normalized.includes('processing') || normalized.includes('submitted')
        ? 'bg-amber-50 text-amber-700'
        : normalized.includes('failed') || normalized.includes('reject') || normalized.includes('suspend') || normalized.includes('refund') || normalized === 'false' || normalized.includes('block')
          ? 'bg-rose-50 text-rose-700'
          : 'bg-neutral-100 text-neutral-600';

  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize', tone)}>{label}</span>;
}

export function AdminResourceTable({
  config,
  rows,
  search,
  onSearchChange,
  isLoading,
  isError,
  onRetry,
  renderActions,
}: {
  config: AdminResourceConfig;
  rows: ApiRecord[];
  search: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  renderActions: (row: ApiRecord) => ReactNode;
}) {
  const labels = config.columnLabels ?? {};
  const columns: DataTableColumn<ApiRecord>[] = [
    {
      key: 'record',
      header: labels.record ?? 'Record',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-neutral-900">{displayValue(getValue(row, config.primaryField))}</div>
          <div className="text-xs text-neutral-500">{getRecordId(row, config)}</div>
          <div className="text-xs text-neutral-500">
            {config.secondaryFields
              .map((field) => displayValue(getValue(row, field)))
              .filter((item) => item !== '-')
              .slice(0, 2)
              .join(' | ') || '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: labels.owner ?? 'Owner',
      render: (row) => <span className="text-sm text-neutral-700">{displayValue(getValue(row, config.ownerField))}</span>,
    },
    {
      key: 'status',
      header: labels.status ?? 'Status',
      render: (row) => <StatusPill value={getValue(row, config.statusField)} />,
    },
    {
      key: 'amount',
      header: labels.amount ?? 'Amount',
      render: (row) => (
        <span className="text-sm font-semibold text-neutral-900">
          {config.amountField
            ? formatAmount(getValue(row, config.amountField))
            : config.extraField
              ? displayValue(getValue(row, config.extraField))
              : '-'}
        </span>
      ),
    },
    {
      key: 'updated',
      header: labels.updated ?? 'Updated',
      render: (row) => <span className="text-sm text-neutral-600">{formatDate(getValue(row, config.dateField))}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '220px',
      render: renderActions,
    },
  ];

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <SearchInput value={search} onChange={onSearchChange} placeholder={config.searchPlaceholder} />
        </div>
        <div className="text-xs font-semibold text-neutral-400">
          {rows.length} record{rows.length !== 1 ? 's' : ''}
          {search && ` matching "${search}"`}
        </div>
      </div>

      <div className="p-5">
        {isError ? (
          <ErrorState title={`${config.title} could not load`} message="Check API server, auth session, and role permissions." onRetry={onRetry} />
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}
          </div>
        ) : (
          <DataTable columns={columns} data={rows} emptyMessage={`No ${config.title.toLowerCase()} found.`} />
        )}
      </div>
    </section>
  );
}
