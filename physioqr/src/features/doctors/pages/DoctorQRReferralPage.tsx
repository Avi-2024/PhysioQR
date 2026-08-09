import React, { useState } from 'react';
import { Download, Share2, Copy, Check } from 'lucide-react';

export default function DoctorQRReferralPage() {
  const [copied, setCopied] = useState(false);
  const referralLink = 'https://physioqr.in/register?doctor=DR001';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(referralLink)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto min-w-0">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">QR Code & Referral Link</h1>
        <p className="text-sm text-neutral-500">Display this QR code at your clinic desk or share the referral link</p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-6 md:p-8 text-center space-y-6 shadow-sm min-w-0">
        <div className="inline-block p-4 bg-white border-2 border-primary-100 rounded-2xl shadow-card">
          <img src={qrCodeUrl} alt="Doctor Referral QR Code" className="w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-lg" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-neutral-900">Dr. Rajesh Sharma</h2>
          <p className="text-sm text-neutral-500">City Spine & Joint Clinic · DR001</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 max-w-md mx-auto bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-xs">
          <span className="truncate text-neutral-600 font-mono flex-1">{referralLink}</span>
          <button onClick={handleCopy} className="min-h-10 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded font-medium flex items-center justify-center gap-1 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <button onClick={() => alert('Downloading Printable Standee PDF...')} className="min-h-11 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors">
            <Download className="w-4 h-4" /> Download Standee PDF
          </button>
          <button onClick={() => alert('Sharing via WhatsApp...')} className="min-h-11 px-4 py-2.5 border border-neutral-300 text-neutral-700 font-semibold text-sm rounded-lg flex items-center justify-center gap-2 hover:bg-neutral-50 transition-colors">
            <Share2 className="w-4 h-4" /> Share on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
