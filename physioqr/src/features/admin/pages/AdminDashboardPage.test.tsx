import { describe, expect, it } from 'vitest';
import { normalizeAdminDashboard } from './AdminDashboardPage';

describe('normalizeAdminDashboard', () => {
  it('handles backend field names and missing array payloads', () => {
    const stats = normalizeAdminDashboard({
      totalPaidPatients: 42,
      pendingWithdrawals: 1200,
      totalDoctorFeeShare: 77,
      physioQrEarnings: 99,
      pendingDoctors: undefined,
      recentPatients: null,
    });

    expect(stats.paidPatients).toBe(42);
    expect(stats.pendingPayouts).toBe(1200);
    expect(stats.doctorFeeSharePayable).toBe(77);
    expect(stats.platformRevenue).toBe(99);
    expect(stats.pendingDoctors).toEqual([]);
    expect(stats.recentPatients).toEqual([]);
  });
});
