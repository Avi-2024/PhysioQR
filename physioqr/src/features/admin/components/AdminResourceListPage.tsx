import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AdminResourceActionDrawer,
  AdminResourceHeader,
  AdminResourceStats,
  AdminResourceTable,
  AuditExportButton,
  DoctorResourceFilters,
  normalizeDoctorStatusFilter,
} from '@/features/admin/components/resources';
import {
  useAdminResourceQuery,
  type AdminResourceKey,
  type DrawerState,
} from '@/features/admin/resources';

// Thin orchestration page: resource data, filters, and UI concerns live in focused modules.
export function AdminResourceListPage({ moduleKey }: { moduleKey: AdminResourceKey }) {
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const doctorFilters = useMemo(() => {
    if (moduleKey !== 'doctors') return {};
    const status = normalizeDoctorStatusFilter(searchParams.get('status'));
    const revenueModel = searchParams.get('revenueModel') || '';
    return {
      ...(status ? { status } : {}),
      ...(revenueModel ? { revenueModel } : {}),
    };
  }, [moduleKey, searchParams]);

  const { config, query, rows, stats } = useAdminResourceQuery(moduleKey, search, doctorFilters);

  const setDoctorFilter = (key: 'status' | 'revenueModel', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const resetDoctorFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('status');
    next.delete('revenueModel');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <AdminResourceHeader
        config={config}
        onCreate={config.createKind ? () => setDrawer({ mode: 'record-form' }) : undefined}
        onRefresh={() => query.refetch()}
        auditAction={moduleKey === 'auditLogs' ? <AuditExportButton search={search} /> : undefined}
      />

      {!query.isLoading && !query.isError && <AdminResourceStats stats={stats} />}

      {moduleKey === 'doctors' && (
        <DoctorResourceFilters
          status={searchParams.get('status') || ''}
          revenueModel={searchParams.get('revenueModel') || ''}
          onChange={setDoctorFilter}
          onReset={resetDoctorFilters}
        />
      )}

      <AdminResourceTable
        moduleKey={moduleKey}
        config={config}
        rows={rows}
        search={search}
        onSearchChange={setSearch}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        onDetails={(row) => setDrawer({ mode: 'details', row })}
        onAction={(row, action, mode) => setDrawer({ mode, row, action })}
      />

      <AdminResourceActionDrawer
        drawer={drawer}
        moduleKey={moduleKey}
        config={config}
        onClose={() => setDrawer(null)}
        onRefresh={() => query.refetch()}
      />
    </div>
  );
}

export default AdminResourceListPage;
