import React, { type ReactNode, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/feedback/EmptyState';

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
  skeletonRows?: number;
  pageSize?: number;
}

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
      <div key={col.key} className="flex items-start justify-between gap-3">
        <span className="shrink-0 text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {col.header}
        </span>
        <span className="min-w-0 text-right text-sm text-gray-800">
          {col.render
            ? col.render(row)
            : String((row as Record<string, unknown>)[col.key] ?? '-')}
        </span>
      </div>
    ))}
  </div>
);

const DataTable = <T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found.',
  onRowClick,
  className,
  skeletonRows = 5,
  pageSize = 10,
}: DataTableProps<T>) => {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const left = String((a as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      const right = String((b as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      const result = left.localeCompare(right, undefined, { numeric: true });
      return sortDirection === 'asc' ? result : -result;
    });
  }, [data, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pagedData = sortedData.slice(start, start + pageSize);

  const toggleSort = (key: string) => {
    setPage(1);
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  };

  return (
    <div className={cn('w-full', className)}>
      {!loading && data.length > 0 && (
        <div className="mb-3 flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {start + 1}-{Math.min(start + pageSize, sortedData.length)} of {sortedData.length}
          </span>
          <span>Click column headers to sort</span>
        </div>
      )}

      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm text-gray-700" role="table">
          <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  <button type="button" onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1 text-left hover:text-gray-800">
                    {col.header}
                    {sortKey === col.key && <span>{sortDirection === 'asc' ? 'up' : 'down'}</span>}
                  </button>
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
              pagedData.map((row, rowIdx) => (
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
                    onRowClick && 'cursor-pointer hover:bg-primary-50 focus:outline-none focus:bg-primary-50'
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {loading &&
          Array.from({ length: skeletonRows }).map((_, i) => (
            <div key={`m-skeleton-${i}`} aria-hidden="true" className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
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
          pagedData.map((row, i) => (
            <MobileDataCard
              key={i}
              columns={columns}
              row={row}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            />
          ))}
      </div>

      {!loading && sortedData.length > pageSize && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-gray-500">
            Page {safePage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage === totalPages}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

DataTable.displayName = 'DataTable';

export { DataTable };
export default DataTable;
