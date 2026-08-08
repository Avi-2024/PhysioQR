import React from 'react';
import { Search } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

const PATIENTS = [
  { id: 'PAT-101', name: 'Ramesh Gupta', mobile: '99XXXX6655', painCategory: 'Lower Back Pain', programme: '14-Day Lower Back Recovery', paymentStatus: 'Paid', feeShare: 300, date: '2026-08-01' },
  { id: 'PAT-102', name: 'Sunita Kapoor', mobile: '98XXXX3344', painCategory: 'Knee Pain', programme: '14-Day Knee Mobility', paymentStatus: 'Paid', feeShare: 300, date: '2026-08-03' },
  { id: 'PAT-103', name: 'Vikram Malhotra', mobile: '97XXXX5443', painCategory: 'Lower Back Pain', programme: 'Under Assessment', paymentStatus: 'Pending', feeShare: 0, date: '2026-08-06' },
];

export default function DoctorPatientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Referred Patients</h1>
          <p className="text-sm text-neutral-500">Patients who scanned your unique QR code or link</p>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3">
        <Search className="w-5 h-5 text-neutral-400" />
        <input placeholder="Search patients by name or mobile..." className="flex-1 border-none text-sm focus:outline-none" />
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
            <tr>
              <th className="p-4">Patient Name</th>
              <th className="p-4">Mobile</th>
              <th className="p-4">Pain Category</th>
              <th className="p-4">Payment</th>
              <th className="p-4">Your Fee Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {PATIENTS.map((p) => (
              <tr key={p.id} className="hover:bg-neutral-50">
                <td className="p-4 font-semibold text-neutral-900">{p.name}</td>
                <td className="p-4 text-neutral-600">{p.mobile}</td>
                <td className="p-4 text-neutral-600">{p.painCategory}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.paymentStatus === 'Paid' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>
                    {p.paymentStatus}
                  </span>
                </td>
                <td className="p-4 font-bold text-neutral-900">{formatCurrency(p.feeShare)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
