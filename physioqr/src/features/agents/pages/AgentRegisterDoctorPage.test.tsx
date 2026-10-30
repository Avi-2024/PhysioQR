// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import apiClient from '@/lib/api-client';
import AgentRegisterDoctorPage from './AgentRegisterDoctorPage';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const mount = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><AgentRegisterDoctorPage /></MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: [{ _id: '507f1f77bcf86cd799439011', name: 'Neck Programme', durationDays: 30 }] } as never);
  vi.mocked(apiClient.post).mockResolvedValue({ data: { _id: '507f1f77bcf86cd799439012', fullName: 'Doctor Demo', temporaryPassword: 'test-only' } } as never);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('fixed 50:50 Doctor registration UI', () => {
  it('shows a non-editable split and submits no custom percentage or fixed commission', async () => {
    mount();
    expect(screen.getByText('Fixed 50:50 revenue share')).toBeTruthy();
    expect(screen.getByText(/Doctor: 50%/i)).toBeTruthy();
    expect(screen.queryByLabelText(/Doctor Commission/i)).toBeNull();
    expect(screen.queryByLabelText(/Commission Type/i)).toBeNull();

    await screen.findByRole('option', { name: /Neck Programme/i });
    const fields: Array<[RegExp, string]> = [
      [/Doctor Full Name/i, 'Doctor Demo'],
      [/Mobile Number/i, '9876543210'],
      [/Qualification/i, 'BPT'],
      [/Specialization/i, 'Orthopaedics'],
      [/Medical Registration Number/i, 'MCI123'],
      [/Clinic Name/i, 'Knee Care'],
      [/City/i, 'Bhopal'],
      [/Patient Price/i, '999'],
    ];
    for (const [label, value] of fields) fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.change(screen.getByLabelText(/Rehab Program/i), { target: { value: '507f1f77bcf86cd799439011' } });
    fireEvent.click(screen.getByRole('button', { name: /register doctor/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    const [, payload] = vi.mocked(apiClient.post).mock.calls[0];
    expect(payload).toMatchObject({ revenueModel: 'split', requestedPatientFee: 999 });
    expect(payload).not.toHaveProperty('requestedFeeSharePercentage');
    expect(payload).not.toHaveProperty('requestedFixedFeeShareAmount');
    expect(payload).not.toHaveProperty('requestedFeeShareType');
  });

  it('keeps the separate Platform Fee Model available without a doctor split', async () => {
    mount();
    fireEvent.change(screen.getByLabelText(/Payment Model/i), { target: { value: 'platform_fee' } });
    expect(screen.queryByText('Fixed 50:50 revenue share')).toBeNull();
    expect(screen.getByText(/verified patient payment belongs to PhysioQR/i)).toBeTruthy();
  });
});
