import React, { useState } from 'react';
import { Wallet, ArrowUpRight, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

export default function DoctorWalletPage() {
  const [available, setAvailable] = useState(2400);
  const [requested, setRequested] = useState(0);
  const [amount, setAmount] = useState('1500');

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amount);
    if (val > available) return alert('Amount exceeds available balance');
    if (val < 1000) return alert('Minimum withdrawal amount is ₹1,000');
    setAvailable((a) => a - val);
    setRequested((r) => r + val);
    alert(`Withdrawal request for ₹${val} submitted to Admin!`);
    setAmount('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Doctor Wallet & Withdrawals</h1>
        <p className="text-sm text-neutral-500">Split Model fee share earnings and payout history (SRS Section 31 & 32)</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-neutral-500 font-semibold uppercase">Pending (Holding 15 days)</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{formatCurrency(600)}</p>
        </div>
        <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-primary-700 font-semibold uppercase">Available for Withdrawal</p>
          <p className="text-3xl font-extrabold text-primary-700 mt-1">{formatCurrency(available)}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-neutral-500 font-semibold uppercase">Lifetime Paid</p>
          <p className="text-2xl font-bold text-success-600 mt-1">{formatCurrency(1500 + requested)}</p>
        </div>
      </div>

      <form onSubmit={handleWithdraw} className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4 shadow-sm">
        <h3 className="font-bold text-neutral-900 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary-600" /> Request Bank Withdrawal
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Enter Amount (₹) *</label>
            <input type="number" min="1000" max={available} value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <span className="text-2xs text-neutral-400 mt-1 block">Min ₹1,000 | Max ₹{available}</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Verified Bank Account</label>
            <input disabled value="HDFC Bank - XXXXXX4829 (KYC Verified)" className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-600 cursor-not-allowed" />
          </div>
        </div>
        <button type="submit" disabled={available < 1000} className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4" /> Submit Payout Request
        </button>
      </form>
    </div>
  );
}
