// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import apiClient from '@/lib/api-client';
import DoctorRegistrationPage from './DoctorRegistrationPage';

vi.mock('@/lib/api-client', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DoctorRegistrationPage (/register/doctor)', () => {
  it('renders all doctor registration fields with correct placeholders and handles state-city dropdowns', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        _id: 'doc-999',
        doctorId: 'DOC-999',
        fullName: 'Dr. Ramesh Kumar',
        mobile: '9876543210',
        email: 'ramesh@clinic.com',
        clinicName: 'Spine & Joint Health',
        city: 'Mumbai',
        state: 'Maharashtra',
        status: 'submitted',
      },
    } as never);

    render(
      <MemoryRouter>
        <DoctorRegistrationPage />
      </MemoryRouter>,
    );

    // Verify fields and placeholders exist
    expect(screen.getByPlaceholderText('Doctor name')).toBeTruthy();
    expect(screen.getByPlaceholderText('10-digit mobile')).toBeTruthy();
    expect(screen.getByPlaceholderText('doctor@clinic.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. BPT, MPT')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. Orthopaedic Physio')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. REG-12345')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. City Spine & Joint Clinic')).toBeTruthy();

    // Fill in credentials
    fireEvent.change(screen.getByPlaceholderText('Doctor name'), { target: { value: 'Dr. Ramesh Kumar' } });
    fireEvent.change(screen.getByPlaceholderText('10-digit mobile'), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByPlaceholderText('doctor@clinic.com'), { target: { value: 'ramesh@clinic.com' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. BPT, MPT'), { target: { value: 'BPT, MPT' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Orthopaedic Physio'), { target: { value: 'Orthopaedic Physio' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. REG-12345'), { target: { value: 'REG-12345' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. City Spine & Joint Clinic'), { target: { value: 'Spine & Joint Health' } });

    // Select State from dropdown
    const stateSelect = screen.getByLabelText(/state/i);
    expect(stateSelect.tagName.toLowerCase()).toBe('select');
    fireEvent.change(stateSelect, { target: { value: 'Maharashtra' } });

    // Coordinated City dropdown
    const citySelect = screen.getByLabelText(/city/i);
    expect(citySelect.tagName.toLowerCase()).toBe('select');
    fireEvent.change(citySelect, { target: { value: 'Mumbai' } });

    // Clinic Address textarea
    const clinicAddress = screen.getByPlaceholderText(/full clinic address/i);
    expect(clinicAddress.tagName.toLowerCase()).toBe('textarea');
    fireEvent.change(clinicAddress, { target: { value: 'Suite 402, Metro Complex, MG Road' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /submit doctor registration/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    const [url, body] = vi.mocked(apiClient.post).mock.calls[0];
    expect(url).toBe('/doctors/self-register');
    expect(body).toMatchObject({
      fullName: 'Dr. Ramesh Kumar',
      mobile: '9876543210',
      email: 'ramesh@clinic.com',
      qualification: 'BPT, MPT',
      specialization: 'Orthopaedic Physio',
      medicalRegNumber: 'REG-12345',
      clinicName: 'Spine & Joint Health',
      state: 'Maharashtra',
      city: 'Mumbai',
      clinicAddress: 'Suite 402, Metro Complex, MG Road',
    });

    // Verification screen without commercial split box
    expect(await screen.findByText('Welcome to PhysioQR Clinical Network!')).toBeTruthy();
    expect(screen.queryByText(/Direct Website 50:50 Split Model/i)).toBeNull();
    expect(screen.getByText('Application Summary')).toBeTruthy();
  });
});
