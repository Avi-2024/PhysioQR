import React, { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/feedback/EmptyState';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  width?: string;
}

export interface DataTableProps<T extends object> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  /** Number of skeleton rows to show while loading */
  skeletonRows?: number;
}

// ---------------------------------------------------------------------------
// MobileDataCard
// ---------------------------------------------------------------------------

export interface MobileDataCardProps<T extends object> {
  columns: DataTableColumn<T>[];
  row: T;
  onClick?: () => void;
}

export const MobileDataCard = <T extends object>({
  columns,
  row,
  onClick,
}: MobileDataCardProps<T>) => (
  <div
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={(e) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
    }}
    className={cn(
      'rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-2',
      onClick &&
        'cursor-pointer hover:bg-gray-50 hover:border-primary-200 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-primary-500'
    )}
  >
    {columns.map((col) => (
      <div key={col.key} className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide shrink-0">
          {col.header}
        </span>
        <span className="text-sm text-gray-800 text-right">
          {col.render
            ? col.render(row)
            : String((row as Record<string, unknown>)[col.key] ?? '—')}
        </span>
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

const DataTable = <T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found.',
  onRowClick,
  className,
  skeletonRows = 5,
}: DataTableProps<T>) => (
  <div className={cn('w-full', className)}>
    {/* Desktop Table */}
    <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
      <table className="w-full text-sm text-left text-gray-700" role="table">
        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {loading &&
            Array.from({ length: skeletonRows }).map((_, rowIdx) => (
              <tr key={`skeleton-${rowIdx}`} aria-hidden="true">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}

          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState title={emptyMessage} />
              </td>
            </tr>
          )}

          {!loading &&
            data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                role={onRowClick ? 'button' : 'row'}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
                className={cn(
                  'transition-colors',
                  onRowClick &&
                    'cursor-pointer hover:bg-primary-50 focus:outline-none focus:bg-primary-50'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>

    {/* Mobile Cards */}
    <div className="md:hidden space-y-3">
      {loading &&
        Array.from({ length: skeletonRows }).map((_, i) => (
          <div
            key={`m-skeleton-${i}`}
            aria-hidden="true"
            className="rounded-xl border border-gray-200 bg-white p-4 space-y-2"
          >
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ))}

      {!loading && data.length === 0 && <EmptyState title={emptyMessage} />}

      {!loading &&
        data.map((row, i) => (
          <MobileDataCard
            key={i}
            columns={columns}
            row={row}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          />
        ))}
    </div>
  </div>
);

DataTable.displayName = 'DataTable';

export { DataTable };
export default DataTable;
