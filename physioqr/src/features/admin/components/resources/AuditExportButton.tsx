import { useState } from 'react';
import { Download } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { asRecord, displayValue } from '@/features/admin/resources';

function errorMessage(error: unknown) {
  const data = asRecord(asRecord(error).response).data;
  return displayValue(asRecord(data).message || asRecord(error).message || 'Request failed.');
}

export function AuditExportButton({ search }: { search: string }) {
  const [error, setError] = useState<string | null>(null);

  const exportLogs = async () => {
    try {
      setError(null);
      const response = await apiClient.get('/admin/audit-logs/export', {
        params: search ? { search } : undefined,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'audit-logs.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={exportLogs}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-100"
      >
        <Download className="h-4 w-4" />
        Export CSV
      </button>
      {error && <div className="mt-2 text-xs font-semibold text-rose-700">{error}</div>}
    </div>
  );
}
