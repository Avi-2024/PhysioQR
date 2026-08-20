import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import ErrorState from '@/components/feedback/ErrorState';
import { formatCurrency, maskMobile } from '@/lib/formatters';

type ApiRecord = Record<string, unknown>;
type PatientRow = {
  id: string;
  fullName: string;
  mobile: string;
  painCategory: string;
  programName: string;
  paymentAmount: number;
  paymentStatus: string;
  programStatus: string;
  feeShareAmount: number;
  feeShareStatus: string;
  createdAt: string;
};

// Renders doctor-owned referred patients from the backend scoped endpoint.
export default function DoctorPatientsPage() {
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['doctor-patients'], queryFn: async () => (await apiClient.get('/doctors/me/patients')).data });
  const rows = useMemo(() => (Array.isArray(query.data) ? query.data as ApiRecord[] : []).map(mapPatient), [query.data]);
  const filteredRows = rows.filter((row) => !search.trim() || [row.fullName, row.mobile, row.painCategory, row.programName, row.paymentStatus, row.programStatus, row.feeShareStatus].some((value) => value.toLowerCase().includes(search.toLowerCase())));

  const columns: DataTableColumn<PatientRow>[] = [
    { key: 'fullName', header: 'Patient', render: (row) => <div><div className="font-semibold text-neutral-900">{row.fullName}</div><div className="text-xs text-neutral-500">{row.id}</div></div> },
    { key: 'mobile', header: 'Mobile', render: (row) => <span className="text-sm text-neutral-700">{maskMobile(row.mobile)}</span> },
    { key: 'painCategory', header: 'Pain Category', render: (row) => <span className="text-sm text-neutral-700">{row.painCategory || '-'}</span> },
    { key: 'programName', header: 'Program', render: (row) => <span className="text-sm font-semibold text-neutral-900">{row.programName || '-'}</span> },
    { key: 'paymentAmount', header: 'Payment', render: (row) => <div><div className="font-semibold text-neutral-900">{formatCurrency(row.paymentAmount)}</div><Pill value={row.paymentStatus || 'unpaid'} /></div> },
    { key: 'programStatus', header: 'Program Status', render: (row) => <Pill value={row.programStatus || 'not assigned'} /> },
    { key: 'feeShareAmount', header: 'Fee Share', render: (row) => <div><div className="font-semibold text-neutral-900">{formatCurrency(row.feeShareAmount)}</div><Pill value={row.feeShareStatus || 'not created'} /></div> },
    { key: 'createdAt', header: 'Registered', render: (row) => <span className="text-sm text-neutral-600">{dateText(row.createdAt)}</span> },
  ];

  if (query.isError) return <ErrorState title="Patients could not load" message="Check doctor login and backend availability." onRetry={() => query.refetch()} />;

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Referred Patients</h1>
          <p className="text-sm text-neutral-500">Referral, payment, program, and fee-share status for patients attributed to your QR code.</p>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3 min-w-0">
        <Search className="w-5 h-5 text-neutral-400 flex-shrink-0" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patients, pain category, program, payment, or fee-share status..." className="min-w-0 flex-1 border-none text-sm focus:outline-none" />
      </div>

      <DataTable columns={columns} data={filteredRows} loading={query.isLoading} emptyMessage="No referred patients found." />
    </div>
  );
}

function mapPatient(record: ApiRecord): PatientRow {
  const program = asRecord(record.program);
  const patientProgram = asRecord(record.patientProgram);
  const payment = asRecord(record.payment);
  const feeShare = asRecord(record.feeShare);
  return {
    id: text(record.patientId || record._id || record.id),
    fullName: text(record.fullName, 'Unnamed patient'),
    mobile: text(record.mobile),
    painCategory: text(record.painCategory),
    programName: text(program.name),
    paymentAmount: Number(payment.amount || 0),
    paymentStatus: text(payment.status, 'unpaid'),
    programStatus: text(patientProgram.status, 'not assigned'),
    feeShareAmount: Number(feeShare.amount || 0),
    feeShareStatus: text(feeShare.status, 'not created'),
    createdAt: text(record.createdAt),
  };
}

function Pill({ value }: { value: string }) {
  const good = ['yes', 'paid', 'active', 'registered', 'completed', 'successful', 'available'].some((item) => value.toLowerCase().includes(item));
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${good ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-700'}`}>{value}</span>;
}

function text(value: unknown, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function dateText(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
