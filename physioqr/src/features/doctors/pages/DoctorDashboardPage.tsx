import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Users, TrendingUp, Wallet, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useAuthStore } from '@/stores/auth.store';

export default function DoctorDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isSplitModel = user?.revenueModel === 'split_model' || user?.revenueModel === undefined;

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 break-words">
            Good morning, {user?.name || 'Dr. Rajesh Sharma'}
          </h1>
          <p className="text-sm text-neutral-500">
            City Spine & Joint Clinic · Revenue Model:{' '}
            <strong className="text-primary-600">
              {isSplitModel ? 'Split Model (60%)' : 'Platform Fee Model'}
            </strong>
          </p>
        </div>
        <button
          onClick={() => navigate('/doctor/qr-referral')}
          className="flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg transition-colors"
        >
          <QrCode className="w-4 h-4" /> View My QR Code
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-sm min-w-0">
          <QrCode className="w-8 h-8 text-primary-600 mb-2" />
          <p className="text-2xl font-bold text-neutral-900">284</p>
          <p className="text-sm text-neutral-500">Total QR Scans</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-sm min-w-0">
          <Users className="w-8 h-8 text-purple-600 mb-2" />
          <p className="text-2xl font-bold text-neutral-900">47</p>
          <p className="text-sm text-neutral-500">Referred Patients</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-sm min-w-0">
          <TrendingUp className="w-8 h-8 text-success-600 mb-2" />
          <p className="text-xl sm:text-2xl font-bold text-neutral-900 break-words">{formatCurrency(15000)}</p>
          <p className="text-sm text-neutral-500">Total Patient Fees Paid</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-sm border-l-4 border-l-amber-500 min-w-0">
          <Wallet className="w-8 h-8 text-amber-600 mb-2" />
          <p className="text-xl sm:text-2xl font-bold text-neutral-900 break-words">{formatCurrency(isSplitModel ? 2400 : 0)}</p>
          <p className="text-sm text-neutral-500">{isSplitModel ? 'Available Fee Share' : 'Platform Fee Active'}</p>
        </div>
      </div>

      {isSplitModel && (
        <div className="bg-gradient-to-r from-primary-900 to-neutral-900 text-white rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold">Doctor Wallet Balance</h3>
            <p className="text-xs text-primary-200 mt-1">
              Available for immediate bank withdrawal · Min limit ₹1,000
            </p>
          </div>
          <div className="flex w-full md:w-auto flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-400">{formatCurrency(2400)}</span>
            <button
              onClick={() => navigate('/doctor/wallet')}
              className="min-h-11 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-900 font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4" /> Request Withdrawal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
