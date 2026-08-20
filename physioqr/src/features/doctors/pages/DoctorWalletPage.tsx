import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, CheckCircle, Clock3, Wallet } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { formatCurrency } from '@/lib/formatters';

type ApiRecord = Record<string, unknown>;

// Renders the doctor's live wallet and submits withdrawal requests to the backend.
export default function DoctorWalletPage() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const walletQuery = useQuery({ queryKey: ['doctor-wallet'], queryFn: async () => (await apiClient.get('/wallet/me')).data });
  const txQuery = useQuery({ queryKey: ['doctor-wallet-transactions'], queryFn: async () => (await apiClient.get('/wallet/me/transactions')).data });
  const mutation = useMutation({
    mutationFn: async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      return apiClient.post('/withdrawals/request', { requestedAmount: Number(amount) });
    },
    onSuccess: async () => {
      setAmount('');
      await queryClient.invalidateQueries({ queryKey: ['doctor-wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['doctor-wallet-transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['doctor-withdrawals'] });
    },
  });

  const wallet = asRecord(walletQuery.data);
  const transactions = Array.isArray(txQuery.data) ? txQuery.data as ApiRecord[] : [];
  const available = Number(wallet.availableBalance || 0);

  if (walletQuery.isError) return <ErrorState title="Wallet could not load" message="Wallet is created after admin doctor approval. Check doctor account status." onRetry={() => walletQuery.refetch()} />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Doctor Wallet & Withdrawals</h1>
        <p className="text-sm text-neutral-500">Split Model fee-share earnings, holding balances, and payout requests.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <WalletCard label="Pending" value={formatCurrency(Number(wallet.pendingBalance || 0))} icon={Clock3} />
        <WalletCard label="Available for Withdrawal" value={formatCurrency(available)} icon={Wallet} strong />
        <WalletCard label="Lifetime Paid" value={formatCurrency(Number(wallet.paidBalance || 0))} icon={CheckCircle} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
          <h3 className="mb-4 font-bold text-neutral-900">Recent Wallet Ledger</h3>
          <div className="space-y-3">
            {txQuery.isLoading && <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">Loading ledger...</div>}
            {!txQuery.isLoading && transactions.length === 0 && <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">No wallet transactions yet.</div>}
            {transactions.slice(0, 8).map((item) => (
              <div key={text(item._id || item.id)} className="flex items-start justify-between gap-4 rounded-lg border border-neutral-200 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold capitalize text-neutral-900">{text(item.type).replace(/_/g, ' ')}</div>
                  <div className="mt-1 text-xs text-neutral-500">{text(item.reason || item.notes, 'Ledger entry')}</div>
                </div>
                <div className={Number(item.amount || 0) >= 0 ? 'font-bold text-emerald-700' : 'font-bold text-rose-700'}>{formatCurrency(Number(item.amount || 0))}</div>
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={(event) => mutation.mutate(event)} className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-neutral-900 flex items-center gap-2"><Wallet className="w-5 h-5 text-primary-600" /> Request Bank Withdrawal</h3>
          <label className="block">
            <span className="block text-xs font-semibold text-neutral-700 mb-1">Enter Amount (INR)</span>
            <input type="number" min="1" max={available || undefined} value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <span className="text-xs text-neutral-400 mt-1 block">Available {formatCurrency(available)}</span>
          </label>
          {mutation.error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{errorMessage(mutation.error)}</div>}
          {mutation.isSuccess && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Withdrawal request submitted.</div>}
          <button type="submit" disabled={mutation.isPending || available <= 0} className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4" /> {mutation.isPending ? 'Submitting...' : 'Submit Payout Request'}
          </button>
        </form>
      </div>
    </div>
  );
}

function WalletCard({ label, value, icon: Icon, strong }: { label: string; value: string; icon: React.ElementType; strong?: boolean }) {
  return (
    <div className={strong ? 'bg-primary-50 border-2 border-primary-200 rounded-xl p-5 shadow-sm' : 'bg-white border border-neutral-200 rounded-xl p-5 shadow-sm'}>
      <Icon className={strong ? 'mb-2 h-5 w-5 text-primary-700' : 'mb-2 h-5 w-5 text-neutral-500'} />
      <p className={strong ? 'text-xs text-primary-700 font-semibold uppercase' : 'text-xs text-neutral-500 font-semibold uppercase'}>{label}</p>
      <p className={strong ? 'text-3xl font-extrabold text-primary-700 mt-1' : 'text-2xl font-bold text-neutral-900 mt-1'}>{value}</p>
    </div>
  );
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function text(value: unknown, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

function errorMessage(error: unknown) {
  const response = asRecord(asRecord(error).response);
  const data = asRecord(response.data);
  return text(data.message || asRecord(error).message, 'Request failed.');
}
