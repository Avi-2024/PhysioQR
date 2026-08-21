import { describe, expect, it } from 'vitest';
import { normalizeAdminDashboard } from './AdminDashboardPage';

describe('normalizeAdminDashboard', () => {
  it('normalizes the live admin dashboard contract', () => {
    const stats = normalizeAdminDashboard({
      totalAgents: 10,
      totalDoctors: 25,
      activeDoctors: 18,
      pendingApprovals: 4,
      suspendedDoctors: 1,
      totalQrScans: 120,
      totalPatients: 80,
      uniquePaidPatients: 52,
      successfulPayments: 58,
      activePrograms: 41,
      todayRevenue: 4500,
      monthlyRevenue: 87000,
      totalDoctorFeeShare: 42000,
      physioQrEarnings: 45000,
      pendingWithdrawals: 6,
      pendingWithdrawalAmount: 22000,
      completedPayouts: 11,
      completedPayoutAmount: 51000,
      refundedPayments: 3,
      totalRefundAmount: 2600,
      highRiskAssessments: 2,
      openSupportTickets: 5,
    });

    expect(stats.uniquePaidPatients).toBe(52);
    expect(stats.successfulPayments).toBe(58);
    expect(stats.pendingWithdrawals).toBe(6);
    expect(stats.pendingWithdrawalAmount).toBe(22000);
    expect(stats.completedPayoutAmount).toBe(51000);
    expect(stats.refundedPayments).toBe(3);
    expect(stats.totalRefundAmount).toBe(2600);
  });

  it('keeps safe compatibility for older dashboard field names', () => {
    const stats = normalizeAdminDashboard({
      totalPaidPatients: 42,
      totalRefunds: 3,
      openTickets: 7,
    });

    expect(stats.uniquePaidPatients).toBe(42);
    expect(stats.refundedPayments).toBe(3);
    expect(stats.openSupportTickets).toBe(7);
  });
});
