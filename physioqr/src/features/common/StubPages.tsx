import React from 'react';

function StubPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="text-4xl mb-4">🚧</div>
      <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
      <p className="text-neutral-500 mt-2 text-sm">This screen is being built.</p>
    </div>
  );
}

export const ForgotPasswordPage = () => (
  <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-primary-50 to-white">
    <div className="bg-white rounded-2xl shadow-modal p-8 max-w-md w-full text-center space-y-4">
      <h1 className="text-xl font-bold text-neutral-900">Reset Password</h1>
      <p className="text-sm text-neutral-500">Enter your email address and we'll send you a reset link.</p>
      <input type="email" placeholder="your@email.com" className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
      <button className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors text-sm">Send Reset Link</button>
    </div>
  </div>
);

export const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
    <p className="text-8xl font-black text-neutral-200">404</p>
    <h1 className="text-2xl font-bold text-neutral-900 mt-4">Page Not Found</h1>
    <p className="text-neutral-500 mt-2 text-sm">The page you're looking for doesn't exist.</p>
    <a href="/" className="mt-6 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors text-sm inline-block">Go Home</a>
  </div>
);
