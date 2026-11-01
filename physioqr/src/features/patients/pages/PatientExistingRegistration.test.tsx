// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import PatientRegistrationPageV3 from './PatientRegistrationPageV3';

vi.mock('@/lib/api-client', () => ({default:{post:vi.fn(),get:vi.fn()}}));
vi.mock('@/stores/auth.store', () => ({useAuthStore:()=>({login:vi.fn(),logout:vi.fn()})}));
afterEach(()=>{cleanup();vi.clearAllMocks();});

const mount=()=>{
  const queryClient=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
  render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/register']}><PatientRegistrationPageV3 /></MemoryRouter></QueryClientProvider>);
};
const fillDetails=async()=>{
  fireEvent.change(screen.getByLabelText('Full name'),{target:{value:'Patient Example'}});
  fireEvent.change(screen.getByLabelText('Email'),{target:{value:'existing@example.com'}});
  fireEvent.change(screen.getByLabelText('Age'),{target:{value:'32'}});
  fireEvent.change(screen.getByLabelText('Gender'),{target:{value:'female'}});
  fireEvent.click(screen.getByRole('button',{name:/Continue to mobile verification/i}));
  expect(await screen.findByText('Verify your mobile number')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Mobile number'),{target:{value:'9876543210'}});
};

describe('duplicate patient registration must not auto-login or open the dashboard',()=>{
  it('stops the registration OTP at an existing verified mobile and offers explicit sign in',async()=>{
    vi.mocked(apiClient.post).mockRejectedValue({response:{status:409,data:{code:'PATIENT_ALREADY_REGISTERED'}}});
    mount();await fillDetails();
    fireEvent.click(screen.getByRole('button',{name:'Send OTP'}));
    const signIn=await screen.findByRole('link',{name:/Sign In with OTP/i});
    expect(signIn.getAttribute('href')).toBe('/login?switch=1');
    expect(screen.queryByText('Mobile number verified successfully.')).toBeNull();
    expect(vi.mocked(apiClient.post).mock.calls.every(([url])=>url!=='/auth/verify-otp')).toBe(true);
  });

  it('blocks an already-used email after OTP is sent, without verifying OTP or logging in',async()=>{
    vi.mocked(apiClient.post).mockImplementation(async (url)=>{
      if(url==='/auth/send-otp')return {data:{message:'OTP sent'}};
      if(url==='/patients/register')throw {response:{status:409,data:{code:'PATIENT_EMAIL_ALREADY_REGISTERED'}}};
      throw Error('Unexpected endpoint: '+url);
    });
    mount();await fillDetails();
    fireEvent.click(screen.getByRole('button',{name:'Send OTP'}));
    expect(await screen.findByLabelText('Enter OTP')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Enter OTP'),{target:{value:'123456'}});
    fireEvent.click(screen.getByRole('button',{name:'Verify OTP'}));
    const signIn=await screen.findByRole('link',{name:/Sign In with OTP/i});
    expect(signIn.getAttribute('href')).toBe('/login?switch=1');
    await waitFor(()=>expect(vi.mocked(apiClient.post).mock.calls.some(([url])=>url==='/patients/register')).toBe(true));
    expect(vi.mocked(apiClient.post).mock.calls.some(([url])=>url==='/auth/verify-otp')).toBe(false);
    expect(screen.queryByText('Mobile number verified successfully.')).toBeNull();
  });
});
