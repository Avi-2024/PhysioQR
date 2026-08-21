import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Banknote, BarChart3, CheckCircle2, Clock3, CreditCard, ExternalLink, FileText, Landmark, MessageSquare, Send, ShieldCheck, Upload, Wallet } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import ErrorState from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/ui/SearchInput';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/cn';

type ApiRecord = Record<string, unknown>;

type WithdrawalRow = {
  id: string;
  requestedAmount: number;
  status: string;
  createdAt: string;
  processedAt: string;
  payoutTransactionRef: string;
  rejectionReason: string;
};

type TransactionRow = {
  id: string;
  type: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
  reason: string;
  createdAt: string;
};

type PaymentWiseRow = {
  id: string;
  patientName: string;
  invoiceNumber: string;
  paymentAmount: number;
  paymentStatus: string;
  feeShareAmount: number;
  feeShareStatus: string;
  programName: string;
};

type SupportTicketRow = {
  id: string;
  ticketId: string;
  category: string;
  subject: string;
  priority: string;
  status: string;
  createdAt: string;
};

// Shows doctor fee-share earnings from wallet and ledger endpoints.
export function DoctorEarningsPage() {
  const summaryQuery = useQuery({ queryKey: ['doctor-summary'], queryFn: async () => (await apiClient.get('/doctors/me/summary')).data });
  const walletQuery = useQuery({ queryKey: ['doctor-wallet'], queryFn: async () => (await apiClient.get('/wallet/me')).data });
  const transactionsQuery = useQuery({ queryKey: ['doctor-wallet-transactions'], queryFn: async () => (await apiClient.get('/wallet/me/transactions')).data });
  const patientsQuery = useQuery({ queryKey: ['doctor-patients'], queryFn: async () => (await apiClient.get('/doctors/me/patients')).data });
  const summary = asRecord(summaryQuery.data);
  const doctor = asRecord(summary.doctor);
  const totals = asRecord(summary.totals);
  const wallet = asRecord(walletQuery.data);
  const transactions = extractItems(transactionsQuery.data).map(mapTransaction);
  const paymentRows = extractItems(patientsQuery.data).map(mapPaymentWiseRow).filter((row) => row.paymentAmount > 0 || row.feeShareAmount > 0);
  const monthlyRows = buildMonthlyRows(transactions);
  const credits = transactions.filter((item) => item.amount > 0);
  const debits = transactions.filter((item) => item.amount < 0);

  if (summaryQuery.isError || walletQuery.isError || transactionsQuery.isError || patientsQuery.isError) {
    return <ErrorState title="Earnings could not load" message="Check doctor login and backend availability." onRetry={() => { summaryQuery.refetch(); walletQuery.refetch(); transactionsQuery.refetch(); patientsQuery.refetch(); }} />;
  }

  return (
    <DoctorWorkspace eyebrow="EARNINGS" title="Earnings Overview" description="Fee-share totals, holding balances, reversals, and ledger movement from successful referred patient payments.">
      <KpiGrid items={[
        ['Lifetime earnings', formatCurrency(Number(wallet.lifetimeEarnings || 0)), Banknote, 'bg-violet-50 text-violet-700'],
        ['Pending', formatCurrency(Number(wallet.pendingBalance || 0)), Clock3, 'bg-amber-50 text-amber-700'],
        ['Available', formatCurrency(Number(wallet.availableBalance || 0)), Wallet, 'bg-emerald-50 text-emerald-700'],
        ['Reversed', formatCurrency(Number(wallet.reversedBalance || 0)), FileText, 'bg-rose-50 text-rose-700'],
      ]} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <LedgerTable rows={transactions} loading={transactionsQuery.isLoading} />
        <aside className="card p-5">
          <h2 className="text-base font-bold text-neutral-900">Fee-Share Rules</h2>
          <div className="mt-4 space-y-3">
            <SummaryRow label="Approved patient fee" value={formatCurrency(Number(doctor.approvedPatientFee || 0))} />
            <SummaryRow label="Fee-share %" value={`${Number(doctor.feeSharePercentage || 0)}%`} />
            <SummaryRow label="Calculation basis" value={labelize(doctor.feeShareCalculationBasis)} />
            <SummaryRow label="Holding period" value={`${Number(doctor.feeShareHoldingDays || 0)} days`} />
            <SummaryRow label="Total revenue" value={formatCurrency(Number(totals.totalRevenue || 0))} />
            <SummaryRow label="Credit entries" value={credits.length} />
            <SummaryRow label="Debit entries" value={debits.length} />
            <SummaryRow label="Withdrawal requested" value={formatCurrency(Number(wallet.withdrawalRequestedAmount || 0))} />
            <SummaryRow label="Paid out" value={formatCurrency(Number(wallet.paidBalance || 0))} />
          </div>
        </aside>
      </div>
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <MonthlyFeeShareChart rows={monthlyRows} />
        <PaymentWiseFeeShareTable rows={paymentRows} loading={patientsQuery.isLoading} />
      </div>
    </DoctorWorkspace>
  );
}

// Shows doctor withdrawal history and lets the doctor request a withdrawal.
export function DoctorWithdrawalsPage() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const summaryQuery = useQuery({ queryKey: ['doctor-summary'], queryFn: async () => (await apiClient.get('/doctors/me/summary')).data });
  const walletQuery = useQuery({ queryKey: ['doctor-wallet'], queryFn: async () => (await apiClient.get('/wallet/me')).data });
  const withdrawalsQuery = useQuery({ queryKey: ['doctor-withdrawals'], queryFn: async () => (await apiClient.get('/withdrawals/me')).data });
  const mutation = useMutation({
    mutationFn: async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      return apiClient.post('/withdrawals/request', { requestedAmount: Number(amount) });
    },
    onSuccess: async () => {
      setAmount('');
      await queryClient.invalidateQueries({ queryKey: ['doctor-wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['doctor-withdrawals'] });
    },
  });

  const summary = asRecord(summaryQuery.data);
  const doctor = asRecord(summary.doctor);
  const wallet = asRecord(walletQuery.data);
  const rows = extractItems(withdrawalsQuery.data).map(mapWithdrawal);
  const available = Number(wallet.availableBalance || 0);
  const minWithdrawal = Number(doctor.minWithdrawal || 1000);
  const maxWithdrawal = Number(doctor.maxWithdrawal || 50000);

  const columns: DataTableColumn<WithdrawalRow>[] = [
    { key: 'id', header: 'Request', render: (row) => <div><div className="font-semibold text-neutral-900">{row.id.slice(-8).toUpperCase()}</div><div className="text-xs text-neutral-500">{dateText(row.createdAt)}</div></div> },
    { key: 'requestedAmount', header: 'Amount', render: (row) => <span className="font-semibold text-neutral-900">{formatCurrency(row.requestedAmount)}</span> },
    { key: 'status', header: 'Status', render: (row) => <StatusPill value={row.status} /> },
    { key: 'payoutTransactionRef', header: 'Payout Ref', render: (row) => <span className="text-sm text-neutral-700">{row.payoutTransactionRef || '-'}</span> },
    { key: 'processedAt', header: 'Processed', render: (row) => <span className="text-sm text-neutral-600">{dateText(row.processedAt)}</span> },
  ];

  if (summaryQuery.isError || walletQuery.isError || withdrawalsQuery.isError) {
    return <ErrorState title="Withdrawals could not load" message="Check doctor login, wallet, KYC, and backend availability." onRetry={() => { summaryQuery.refetch(); walletQuery.refetch(); withdrawalsQuery.refetch(); }} />;
  }

  return (
    <DoctorWorkspace eyebrow="WITHDRAWALS" title="Withdrawal History" description="Request payout from available fee-share balance and track admin payout status.">
      <KpiGrid items={[
        ['Available', formatCurrency(available), Wallet, 'bg-emerald-50 text-emerald-700'],
        ['Requested', formatCurrency(Number(wallet.withdrawalRequestedAmount || 0)), ArrowUpRight, 'bg-amber-50 text-amber-700'],
        ['Paid', formatCurrency(Number(wallet.paidBalance || 0)), CheckCircle2, 'bg-sky-50 text-sky-700'],
        ['Lifetime', formatCurrency(Number(wallet.lifetimeEarnings || 0)), Banknote, 'bg-violet-50 text-violet-700'],
      ]} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card p-5">
          <DataTable columns={columns} data={rows} loading={withdrawalsQuery.isLoading} emptyMessage="No withdrawal requests yet." />
        </section>
        <form className="card p-5 space-y-4" onSubmit={(event) => mutation.mutate(event)}>
          <h2 className="text-base font-bold text-neutral-900">Request Withdrawal</h2>
          <div className="rounded-lg bg-primary-50 p-4 text-sm text-primary-800">
            Available balance: <strong>{formatCurrency(available)}</strong>
            <div className="mt-2 grid gap-1 text-xs text-primary-700">
              <span>Minimum withdrawal: <strong>{formatCurrency(minWithdrawal)}</strong></span>
              <span>Maximum withdrawal: <strong>{formatCurrency(maxWithdrawal)}</strong></span>
              <span>Next payout cycle: <strong className="capitalize">{labelize(doctor.payoutCycle || 'monthly')}</strong></span>
            </div>
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Amount</span>
            <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min={minWithdrawal || 1} max={Math.min(available || maxWithdrawal, maxWithdrawal)} required className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </label>
          <ActionError error={mutation.error} />
          <button disabled={mutation.isPending || available <= 0} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
            <ArrowUpRight className="h-4 w-4" />
            {mutation.isPending ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </DoctorWorkspace>
  );
}

// Lets doctors view and submit allowed profile, KYC, and bank details.
export function DoctorBankKYCPage() {
  return <DoctorEditableProfile mode="kyc" />;
}

// Lets doctors view and update allowed profile fields.
export function DoctorProfilePage() {
  return <DoctorEditableProfile mode="profile" />;
}

// Gives doctors a scoped support workspace to contact Admin and track replies.
export function DoctorSupportPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ category: 'technical', priority: 'medium', subject: '', description: '' });
  const ticketsQuery = useQuery({ queryKey: ['doctor-support-tickets'], queryFn: async () => (await apiClient.get('/support')).data });
  const mutation = useMutation({
    mutationFn: async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      return apiClient.post('/support', form);
    },
    onSuccess: async () => {
      setForm({ category: 'technical', priority: 'medium', subject: '', description: '' });
      await queryClient.invalidateQueries({ queryKey: ['doctor-support-tickets'] });
    },
  });
  const rows = extractItems(ticketsQuery.data).map(mapSupportTicket);
  const columns: DataTableColumn<SupportTicketRow>[] = [
    { key: 'ticketId', header: 'Ticket', render: (row) => <div><div className="font-semibold text-neutral-900">{row.ticketId}</div><div className="text-xs text-neutral-500">{dateText(row.createdAt)}</div></div> },
    { key: 'category', header: 'Category', render: (row) => <StatusPill value={labelize(row.category)} /> },
    { key: 'subject', header: 'Subject', render: (row) => <span className="text-sm font-semibold text-neutral-900">{row.subject}</span> },
    { key: 'priority', header: 'Priority', render: (row) => <StatusPill value={row.priority} /> },
    { key: 'status', header: 'Status', render: (row) => <StatusPill value={labelize(row.status)} /> },
  ];

  if (ticketsQuery.isError) return <ErrorState title="Support could not load" message="Check doctor login and backend availability." onRetry={() => ticketsQuery.refetch()} />;

  return (
    <DoctorWorkspace eyebrow="SUPPORT" title="Contact Admin Support" description="Create support requests for QR code, profile, withdrawal, fee-share, payment, or technical issues.">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="card p-5">
          <DataTable columns={columns} data={rows} loading={ticketsQuery.isLoading} emptyMessage="No support tickets yet." />
        </section>
        <form className="card p-5 space-y-4" onSubmit={(event) => mutation.mutate(event)}>
          <h2 className="flex items-center gap-2 text-base font-bold text-neutral-900"><MessageSquare className="h-5 w-5 text-primary-600" /> New Ticket</h2>
          <Select label="Category" value={form.category} onChange={(value) => setForm((current) => ({ ...current, category: value }))} options={['technical', 'profile', 'qr_code', 'fee_share', 'withdrawal', 'payment', 'video_access', 'program']} />
          <Select label="Priority" value={form.priority} onChange={(value) => setForm((current) => ({ ...current, priority: value }))} options={['low', 'medium', 'high']} />
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Subject</span>
            <input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} required className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Description</span>
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="mt-2 min-h-28 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </label>
          {mutation.isSuccess && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Support ticket created.</div>}
          <ActionError error={mutation.error} />
          <button disabled={mutation.isPending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
            <Send className="h-4 w-4" />
            {mutation.isPending ? 'Creating...' : 'Create Ticket'}
          </button>
        </form>
      </div>
    </DoctorWorkspace>
  );
}

function DoctorEditableProfile({ mode }: { mode: 'profile' | 'kyc' }) {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ['doctor-profile'], queryFn: async () => (await apiClient.get('/doctors/me/profile')).data });
  const mutation = useMutation({
    mutationFn: async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      return apiClient.put('/doctors/me/profile', Object.fromEntries(form.entries()));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['doctor-profile'] });
    },
  });

  const profile = asRecord(profileQuery.data);

  if (profileQuery.isError) return <ErrorState title="Doctor profile could not load" message="Check doctor login and backend availability." onRetry={() => profileQuery.refetch()} />;

  return (
    <DoctorWorkspace
      eyebrow={mode === 'kyc' ? 'BANK & KYC' : 'PROFILE'}
      title={mode === 'kyc' ? 'Bank & KYC Verification' : 'My Profile'}
      description={mode === 'kyc' ? 'Submit bank and KYC details required for withdrawals. Admin verifies sensitive documents.' : 'Update editable personal, professional, and clinic profile information.'}
    >
      <KpiGrid items={[
        ['Account status', text(profile.status, '-'), ShieldCheck, 'bg-teal-50 text-teal-700'],
        ['KYC status', text(profile.kycStatus, 'pending'), FileText, 'bg-amber-50 text-amber-700'],
        ['Bank verified', text(profile.bankVerified, 'No'), Landmark, 'bg-emerald-50 text-emerald-700'],
        ['Revenue model', text(profile.revenueModel, 'split'), CreditCard, 'bg-violet-50 text-violet-700'],
      ]} />
      <form key={text(profile.updatedAt || profile._id)} className="card p-5 space-y-5" onSubmit={(event) => mutation.mutate(event)}>
        {mode === 'profile' ? <ProfileFields profile={profile} /> : <KycFields profile={profile} />}
        {mutation.isSuccess && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Profile saved.</div>}
        <ActionError error={mutation.error} />
        <div className="flex justify-end border-t border-neutral-100 pt-4">
          <button disabled={mutation.isPending || profileQuery.isLoading} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
            {mutation.isPending ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </DoctorWorkspace>
  );
}

function ProfileFields({ profile }: { profile: ApiRecord }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Input name="fullName" label="Full name" defaultValue={text(profile.fullName)} />
      <Input name="email" label="Email" type="email" defaultValue={text(profile.email)} />
      <Input name="whatsapp" label="WhatsApp" defaultValue={text(profile.whatsapp)} />
      <Input name="qualification" label="Qualification" defaultValue={text(profile.qualification)} />
      <Input name="specialization" label="Specialization" defaultValue={text(profile.specialization)} />
      <Input name="medicalRegNumber" label="Medical registration number" defaultValue={text(profile.medicalRegNumber)} />
      <Input name="clinicName" label="Clinic name" defaultValue={text(profile.clinicName)} />
      <Input name="city" label="City" defaultValue={text(profile.city)} />
      <Input name="state" label="State" defaultValue={text(profile.state)} />
      <Input name="clinicContact" label="Clinic contact" defaultValue={text(profile.clinicContact)} />
      <Textarea name="clinicAddress" label="Clinic address" defaultValue={text(profile.clinicAddress)} />
    </div>
  );
}

function KycFields({ profile }: { profile: ApiRecord }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Input name="panNumber" label="PAN / tax ID" defaultValue={text(profile.panNumber)} />
      <Input name="bankAccountHolder" label="Bank account holder" defaultValue={text(profile.bankAccountHolder)} />
      <Input name="bankAccountNumber" label="Bank account number" defaultValue={text(profile.bankAccountNumber)} />
      <Input name="bankName" label="Bank name" defaultValue={text(profile.bankName)} />
      <Input name="branchName" label="Branch name" defaultValue={text(profile.branchName)} />
      <Input name="ifscCode" label="IFSC code" defaultValue={text(profile.ifscCode)} />
      <Input name="upiId" label="UPI ID" defaultValue={text(profile.upiId)} />
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 md:col-span-2">
        KYC and bank verification status is admin controlled. Submitting changes updates your profile; withdrawals remain blocked until Admin verifies KYC and bank details.
      </div>
      <KycDocumentManager profile={profile} />
    </div>
  );
}

function KycDocumentManager({ profile }: { profile: ApiRecord }) {
  const queryClient = useQueryClient();
  const [documentType, setDocumentType] = useState('identity_proof');
  const [file, setFile] = useState<File | null>(null);
  const documents = Array.isArray(profile.kycDocuments) ? profile.kycDocuments as ApiRecord[] : [];
  const uploadMutation = useMutation({
    mutationFn: async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!file) throw new Error('Select a document file first.');
      const payload = new FormData();
      payload.append('documentType', documentType);
      payload.append('document', file);
      return apiClient.post('/doctors/me/kyc-documents', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: async () => {
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ['doctor-profile'] });
    },
  });

  const openDocument = async (documentId: string) => {
    const response = await apiClient.get(`/doctors/me/kyc-documents/${documentId}/access`);
    const access = asRecord(response.data);
    if (access.url) window.open(String(access.url), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="md:col-span-2 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">KYC Documents</h3>
          <p className="text-xs text-neutral-500">Upload PAN, registration, identity, address, and cancelled cheque documents for Admin verification.</p>
        </div>
      </div>
      <form onSubmit={(event) => uploadMutation.mutate(event)} className="mt-4 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto]">
        <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500">
          {['identity_proof', 'address_proof', 'medical_registration', 'cancelled_cheque', 'pan', 'profile_photo', 'other'].map((option) => <option key={option} value={option}>{labelize(option)}</option>)}
        </select>
        <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary-700" />
        <button type="submit" disabled={uploadMutation.isPending || !file} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
          <Upload className="h-4 w-4" />
          {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      <ActionError error={uploadMutation.error} />
      {uploadMutation.isSuccess && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Document uploaded for Admin verification.</div>}
      <div className="mt-4 grid gap-2">
        {documents.length === 0 && <div className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-500">No KYC documents uploaded yet.</div>}
        {documents.map((document) => (
          <div key={text(document._id || document.id || document.key)} className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="font-semibold text-neutral-900">{labelize(document.documentType)}</div>
              <div className="truncate text-xs text-neutral-500">{text(document.originalName || document.key)} | {dateText(document.uploadedAt)}</div>
            </div>
            <button type="button" onClick={() => openDocument(text(document._id || document.id))} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
              <ExternalLink className="h-4 w-4" />
              Access
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LedgerTable({ rows, loading }: { rows: TransactionRow[]; loading: boolean }) {
  const [search, setSearch] = useState('');
  const filteredRows = rows.filter((row) => !search.trim() || [row.type, row.reason].some((value) => value.toLowerCase().includes(search.toLowerCase())));
  const columns: DataTableColumn<TransactionRow>[] = [
    { key: 'type', header: 'Type', render: (row) => <StatusPill value={labelize(row.type)} /> },
    { key: 'amount', header: 'Amount', render: (row) => <span className={cn('font-semibold', row.amount >= 0 ? 'text-emerald-700' : 'text-rose-700')}>{formatCurrency(row.amount)}</span> },
    { key: 'newBalance', header: 'Balance', render: (row) => <span className="font-semibold text-neutral-900">{formatCurrency(row.newBalance)}</span> },
    { key: 'reason', header: 'Reason', render: (row) => <span className="text-sm text-neutral-700">{row.reason || '-'}</span> },
    { key: 'createdAt', header: 'Date', render: (row) => <span className="text-sm text-neutral-600">{dateText(row.createdAt)}</span> },
  ];
  return (
    <section className="card p-5">
      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search ledger type or reason" /></div>
      <DataTable columns={columns} data={filteredRows} loading={loading} emptyMessage="No wallet ledger entries yet." />
    </section>
  );
}

function MonthlyFeeShareChart({ rows }: { rows: { label: string; amount: number }[] }) {
  const max = Math.max(...rows.map((row) => row.amount), 1);
  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-neutral-900"><BarChart3 className="h-5 w-5 text-primary-600" /> Monthly Fee Share</h2>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">No monthly fee-share data yet.</div>}
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-neutral-700">{row.label}</span>
              <span className="font-bold text-neutral-900">{formatCurrency(row.amount)}</span>
            </div>
            <div className="h-2 rounded-full bg-neutral-100">
              <div className="h-2 rounded-full bg-primary-600" style={{ width: `${Math.max((row.amount / max) * 100, 4)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PaymentWiseFeeShareTable({ rows, loading }: { rows: PaymentWiseRow[]; loading: boolean }) {
  const columns: DataTableColumn<PaymentWiseRow>[] = [
    { key: 'patientName', header: 'Patient', render: (row) => <span className="font-semibold text-neutral-900">{row.patientName}</span> },
    { key: 'programName', header: 'Program', render: (row) => <span className="text-sm text-neutral-700">{row.programName || '-'}</span> },
    { key: 'invoiceNumber', header: 'Invoice', render: (row) => <span className="text-sm text-neutral-600">{row.invoiceNumber || '-'}</span> },
    { key: 'paymentAmount', header: 'Payment', render: (row) => <div><div className="font-semibold text-neutral-900">{formatCurrency(row.paymentAmount)}</div><StatusPill value={row.paymentStatus || 'unpaid'} /></div> },
    { key: 'feeShareAmount', header: 'Fee Share', render: (row) => <div><div className="font-semibold text-neutral-900">{formatCurrency(row.feeShareAmount)}</div><StatusPill value={row.feeShareStatus || 'not created'} /></div> },
  ];
  return <section className="card p-5"><DataTable columns={columns} data={rows} loading={loading} emptyMessage="No payment-wise fee-share entries yet." /></section>;
}

function DoctorWorkspace({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-teal-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          {eyebrow}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-neutral-900 sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function KpiGrid({ items }: { items: [string, string | number, React.ElementType, string][] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value, Icon, tone]) => (
        <div key={label} className="card p-4">
          <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-lg', tone)}><Icon className="h-5 w-5" /></div>
          <div className="break-words text-xl font-bold text-neutral-900">{value}</div>
          <div className="text-sm text-neutral-500">{label}</div>
        </div>
      ))}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-neutral-500">{label}</span><span className="font-semibold text-neutral-900">{value}</span></div>;
}

function Input({ name, label, defaultValue, type = 'text' }: { name: string; label: string; defaultValue?: string; type?: string }) {
  return <label className="block"><span className="text-sm font-semibold text-neutral-700">{label}</span><input name={name} type={type} defaultValue={defaultValue} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>;
}

function Textarea({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return <label className="block md:col-span-2"><span className="text-sm font-semibold text-neutral-700">{label}</span><textarea name={name} defaultValue={defaultValue} className="mt-2 min-h-24 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm capitalize focus:border-primary-500 focus:ring-primary-500">
        {options.map((option) => <option key={option} value={option}>{labelize(option)}</option>)}
      </select>
    </label>
  );
}

function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone = normalized.includes('paid') || normalized.includes('available') || normalized.includes('completed') || normalized.includes('approved')
    ? 'bg-emerald-50 text-emerald-700'
    : normalized.includes('pending') || normalized.includes('requested') || normalized.includes('hold') || normalized.includes('processing')
      ? 'bg-amber-50 text-amber-700'
      : normalized.includes('failed') || normalized.includes('reject') || normalized.includes('reverse')
        ? 'bg-rose-50 text-rose-700'
        : 'bg-neutral-100 text-neutral-700';
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize', tone)}>{value}</span>;
}

function ActionError({ error }: { error: unknown }) {
  if (!error) return null;
  const response = asRecord(asRecord(error).response);
  const data = asRecord(response.data);
  return <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{text(data.message || asRecord(error).message, 'Request failed.')}</div>;
}

function mapWithdrawal(record: ApiRecord): WithdrawalRow {
  return {
    id: text(record._id || record.id),
    requestedAmount: Number(record.requestedAmount || 0),
    status: text(record.status, 'requested'),
    createdAt: text(record.createdAt),
    processedAt: text(record.processedAt),
    payoutTransactionRef: text(record.payoutTransactionRef),
    rejectionReason: text(record.rejectionReason),
  };
}

function mapTransaction(record: ApiRecord): TransactionRow {
  return {
    id: text(record._id || record.id),
    type: text(record.type),
    amount: Number(record.amount || 0),
    previousBalance: Number(record.previousBalance || 0),
    newBalance: Number(record.newBalance || 0),
    reason: text(record.reason || record.notes),
    createdAt: text(record.createdAt),
  };
}

function mapPaymentWiseRow(record: ApiRecord): PaymentWiseRow {
  const program = asRecord(record.program);
  const payment = asRecord(record.payment);
  const feeShare = asRecord(record.feeShare);
  return {
    id: text(record._id || record.id),
    patientName: text(record.fullName, 'Unnamed patient'),
    invoiceNumber: text(payment.invoiceNumber),
    paymentAmount: Number(payment.amount || 0),
    paymentStatus: text(payment.status, 'unpaid'),
    feeShareAmount: Number(feeShare.amount || 0),
    feeShareStatus: text(feeShare.status, 'not created'),
    programName: text(program.name),
  };
}

function mapSupportTicket(record: ApiRecord): SupportTicketRow {
  return {
    id: text(record._id || record.id),
    ticketId: text(record.ticketId || record._id || record.id),
    category: text(record.category),
    subject: text(record.subject, '-'),
    priority: text(record.priority, 'medium'),
    status: text(record.status, 'open'),
    createdAt: text(record.createdAt),
  };
}

function buildMonthlyRows(transactions: TransactionRow[]) {
  const rows = new Map<string, number>();
  transactions
    .filter((transaction) => transaction.amount > 0 && ['fee_share_pending', 'fee_share_released', 'fee_share_credit'].includes(transaction.type))
    .forEach((transaction) => {
      const date = new Date(transaction.createdAt);
      if (Number.isNaN(date.getTime())) return;
      const label = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      rows.set(label, (rows.get(label) || 0) + transaction.amount);
    });
  return Array.from(rows.entries()).slice(0, 6).map(([label, amount]) => ({ label, amount }));
}

function extractItems(payload: unknown): ApiRecord[] {
  if (Array.isArray(payload)) return payload as ApiRecord[];
  const record = asRecord(payload);
  if (Array.isArray(record.items)) return record.items as ApiRecord[];
  if (Array.isArray(record.data)) return record.data as ApiRecord[];
  return [];
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function text(value: unknown, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function labelize(value: unknown) {
  return text(value, '-').replace(/_/g, ' ');
}

function dateText(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default DoctorEarningsPage;
