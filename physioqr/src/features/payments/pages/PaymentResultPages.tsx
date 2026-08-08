import React from 'react';
import { CheckCircle, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PaymentSuccessPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-success-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-modal p-8 max-w-md w-full text-center space-y-5">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-success-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-success-600" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Payment Successful!</h1>
          <p className="text-neutral-500 mt-2 text-sm">Your rehabilitation programme has been activated. Day 1 is now available.</p>
        </div>
        <div className="bg-success-50 rounded-xl p-4 text-sm text-success-700 space-y-1">
          <p>✓ Programme activated for 14 days</p>
          <p>✓ Receipt sent to your email</p>
          <p>✓ WhatsApp notification sent</p>
        </div>
        <button onClick={() => navigate('/patient/dashboard')} className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
          <Home className="w-4 h-4" /> Go to My Dashboard
        </button>
      </div>
    </div>
  );
}

export function PaymentFailedPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-danger-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-modal p-8 max-w-md w-full text-center space-y-5">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-danger-100 flex items-center justify-center">
            <span className="text-4xl text-danger-600">✕</span>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Payment Failed</h1>
          <p className="text-neutral-500 mt-2 text-sm">Your payment could not be processed. No amount has been deducted. Please try again.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="flex-1 px-4 py-3 border border-neutral-300 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <button onClick={() => navigate(-1)} className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors">
            Retry Payment
          </button>
        </div>
      </div>
    </div>
  );
}
