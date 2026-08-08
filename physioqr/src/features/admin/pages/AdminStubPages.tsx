import React from 'react';

// Simple placeholder page factory for stubs not yet built
function StubPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="text-4xl mb-4">🚧</div>
      <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
      <p className="text-neutral-500 mt-2 text-sm">This screen is being built.</p>
    </div>
  );
}

export const AdminAgentsPage = () => <StubPage title="Agent Management" />;
export const AdminAgentDetailPage = () => <StubPage title="Agent Details" />;
export const AdminDoctorsPage = () => <StubPage title="Doctor Management" />;
export const AdminDoctorNewPage = () => <StubPage title="Register New Doctor" />;
export const AdminDoctorDetailPage = () => <StubPage title="Doctor Details" />;
export const AdminPatientsPage = () => <StubPage title="Patient Management" />;
export const AdminPaymentsPage = () => <StubPage title="Payments" />;
export const AdminFeeSharesPage = () => <StubPage title="Fee Shares" />;
export const AdminWalletsPage = () => <StubPage title="Doctor Wallets" />;
export const AdminWithdrawalsPage = () => <StubPage title="Withdrawal Requests" />;
export const AdminReportsPage = () => <StubPage title="Reports & Analytics" />;
export const AdminSettingsPage = () => <StubPage title="System Settings" />;
