// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import DoctorSelfRegisterPage from './DoctorSelfRegisterPage';
import { DoctorExperienceSection } from '../components/DoctorExperienceSection';
import { LandingHeader } from '../components/LandingHeader';

vi.mock('@/lib/api-client', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
afterEach(() => {cleanup();vi.clearAllMocks();});
const mount=(node:React.ReactNode)=>{
  const client=new QueryClient({defaultOptions:{mutations:{retry:false},queries:{retry:false}}});
  return render(<QueryClientProvider client={client}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>);
};

describe('Public independent doctor registration',()=>{
  it('shows an accessible Doctor Register button and keeps the patient registration route intact',()=>{
    mount(<><LandingHeader onOpenPortal={vi.fn()}/><DoctorExperienceSection onOpenPortal={vi.fn()}/></>);
    const links=screen.getAllByRole('link',{name:/register as doctor/i});
    expect(links.some(link=>link.getAttribute('href')==='/doctor-register')).toBe(true);
    expect(screen.getByRole('link',{name:'Register as a patient'}).getAttribute('href')).toBe('/register');
  });

  it('submits an agentless application without trusting any commercial terms from the browser',async()=>{
    vi.mocked(apiClient.post).mockResolvedValue({data:{status:'submitted'}} as never);
    mount(<DoctorSelfRegisterPage/>);
    expect(screen.getByText(/50% Doctor \/ 50% PhysioQR/i)).toBeTruthy();
    for(const [label,value] of [
      ['Doctor full name','Dr Test Doctor'], ['Mobile number','9876543210'],
      ['Qualification','MBBS'], ['Specialization','Orthopedics'],
      ['Medical registration number','MED-101'], ['Clinic name','Test Clinic'],
      ['City','Bhopal'],
    ]) fireEvent.change(screen.getByRole('textbox',{name:new RegExp(label,'i')}),{target:{value}});
    fireEvent.click(screen.getByRole('button',{name:'Submit Doctor Registration'}));
    await waitFor(()=>expect(apiClient.post).toHaveBeenCalled());
    const [url,body]=vi.mocked(apiClient.post).mock.calls[0];
    expect(url).toBe('/doctors/self-register');
    expect(body).toMatchObject({fullName:'Dr Test Doctor',mobile:'9876543210',medicalRegNumber:'MED-101'});
    for(const forbidden of ['agent','revenueModel','requestedFeeSharePercentage','requestedPatientFee','registrationSource']){
      expect(body).not.toHaveProperty(forbidden);
    }
    expect(await screen.findByText('Registration submitted successfully')).toBeTruthy();
    expect(screen.getByText(/Admin verification/i)).toBeTruthy();
  });

  it('does not call signup API if mandatory form inputs are empty',()=>{
    mount(<DoctorSelfRegisterPage/>);
    fireEvent.click(screen.getByRole('button',{name:'Submit Doctor Registration'}));
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
