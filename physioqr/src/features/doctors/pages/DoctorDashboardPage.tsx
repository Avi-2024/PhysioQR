import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Users, TrendingUp, Wallet, ArrowUpRight, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useAuthStore } from '@/stores/auth.store';

export default function DoctorDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isSplitModel = user?.revenueModel === 'split_model' || user?.revenueModel === undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Good morning, {user?.name || 'Dr. Rajesh Sharma'} 👋</h1>
          <p className="text-sm text-neutral-500">City Spine & Joint Clinic · Revenue Model: <strong className="text-primary-600">{isSplitModel ? 'Split Model (60%)' : 'Platform Fee Model'}</strong></p>
        </div>
        <button onClick={() => navigate('/doctor/qr-referral')} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg transition-colors">
          <QrCode className="w-4 h-4" /> View My QR Code
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
          <QrCode className="w-8 h-8 text-primary-600 mb-2" />
          <p className="text-2xl font-bold text-neutral-900">284</p>
          <p className="text-sm text-neutral-500">Total QR Scans</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
          <Users className="w-8 h-8 text-purple-600 mb-2" />
          <p className="text-2xl font-bold text-neutral-900">47</p>
          <p className="text-sm text-neutral-500">Referred Patients</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
          <TrendingUp className="w-8 h-8 text-success-600 mb-2" />
          <p className="text-2xl font-bold text-neutral-900">{formatCurrency(15000)}</p>
          <p className="text-sm text-neutral-500">Total Patient Fees Paid</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm border-l-4 border-l-amber-500">
          <Wallet className="w-8 h-8 text-amber-600 mb-2" />
          <p className="text-2xl font-bold text-neutral-900">{formatCurrency(isSplitModel ? 2400 : 0)}</p>
          <p className="text-sm text-neutral-500">{isSplitModel ? 'Available Fee Share' : 'Platform Fee Active'}</p>
        </div>
      </div>

      {isSplitModel && (
        <div className="bg-gradient-to-r from-primary-900 to-neutral-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-lg font-bold">Doctor Wallet Balance</h3>
            <p className="text-xs text-primary-200 mt-1">Available for immediate bank withdrawal · Min limit ₹1,000</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-3xl font-extrabold text-amber-400">{formatCurrency(2400)}</span>
            <button onClick={() => navigate('/doctor/wallet')} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-900 font-bold text-sm rounded-lg transition-colors flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4" /> Request Withdrawal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
