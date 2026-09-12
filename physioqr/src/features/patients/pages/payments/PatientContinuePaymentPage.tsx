import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/api-client';
import { formatCurrency } from '@/lib/formatters';

type ApiRecord = Record<string, unknown>;
declare global { interface Window { Razorpay?: new (options:Record<string,unknown>) => { open:()=>void } } }

export default function PatientContinuePaymentPage() {
  const navigate = useNavigate();
  const statusQuery = useQuery({
    queryKey: ['patient-onboarding-status', 'payment-continuation'],
    queryFn: async () => (await apiClient.get('/patients/me/onboarding-status')).data,
    staleTime: 0,
  });

  const status = asRecord(statusQuery.data);
  const patient = asRecord(status.patient);
  const nextAction = text(status.nextAction);
  const canContinue = Boolean(status.assessmentCompleted)
    && !Boolean(status.reviewPending)
    && !Boolean(status.reviewBlocked)
    && !Boolean(status.paymentCompleted);

  const quoteQuery = useQuery({
    queryKey: ['patient-purchase-quote', 'payment-continuation'],
    enabled: canContinue,
    queryFn: async () => (await apiClient.get('/patients/me/purchase-quote')).data,
  });

  const quote = asRecord(quoteQuery.data);
  const primaryProgram = asRecord(quote.program);
  const programs = asRecordArray(quote.programs).length ? asRecordArray(quote.programs) : (Object.keys(primaryProgram).length ? [primaryProgram] : []);
  const doctor = asRecord(quote.doctor);
  const pricing = asRecord(quote.pricing);
  const purchaseMode = text(quote.purchaseMode, 'doctor_referral');
  const isDirect = purchaseMode === 'direct';
  const payable = Number(pricing.finalAmount || 0);
  const patientId = text(patient.id || patient._id);
  const programId = text(primaryProgram.id || primaryProgram._id);
  const doctorId = text(doctor.id || doctor._id);

  const verifyGatewayPayment = async (
    payload:{razorpay_order_id:string;razorpay_payment_id:string;razorpay_signature:string},
  ) => {
    const endpoint = isDirect ? '/payments/direct/verify' : '/payments/verify';
    await apiClient.post(endpoint, payload);
  };

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const endpoint = isDirect ? '/payments/direct/create-order' : '/payments/create-order';
      const orderResponse = await apiClient.post(endpoint, {
        patientId,
        programId,
        ...(isDirect ? {} : { doctorId }),
        idempotencyKey: `patient-${patientId}-${programId}-${Date.now()}`,
      });
      const order = asRecord(orderResponse.data);
      if (order.key) {
        await loadRazorpayScript();
        await openRazorpayCheckout({ order, patient, onVerify: verifyGatewayPayment });
        return;
      }
      await verifyGatewayPayment({
        razorpay_order_id: text(order.orderId),
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_signature: 'mock_signature',
      });
    },
    onSuccess: () => navigate('/payment-success', { replace: true }),
  });

  if (statusQuery.isLoading) return <Loading text="Loading your saved rehabilitation journey..." />;
  if (statusQuery.isError) return <Message title="Unable to load your account" body="Please try again from your patient dashboard." />;
  if (nextAction === 'dashboard' || Boolean(status.programActivated)) {
    return <Message title="Your rehabilitation is already active" body="Your payment is complete and your approved programmes are ready." action="Open dashboard" onAction={() => navigate('/patient/dashboard')} />;
  }
  if (Boolean(status.reviewPending) || Boolean(status.reviewBlocked)) {
    return <Message title="Clinical review is not cleared" body="Payment stays locked until the clinical review is cleared." action="Back to dashboard" onAction={() => navigate('/patient/dashboard')} />;
  }
  if (!canContinue) return <Message title="Payment is not available yet" body="Complete the required onboarding steps before payment." action="Back to dashboard" onAction={() => navigate('/patient/dashboard')} />;

  const paymentReady = Boolean(payable && programId && (isDirect || doctorId));

  return (
    <div className="mx-auto max-w-3xl py-6 sm:py-10">
      <button type="button" onClick={() => navigate('/patient/dashboard')} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4"/>Back to patient portal</button>
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><CreditCard className="h-6 w-6"/></div>
        <h1 className="mt-5 text-2xl font-bold text-neutral-950">Complete patient payment</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">Your clinical review is cleared. Confirm the approved rehabilitation programmes and complete one secure payment to activate the bundle.</p>

        {quoteQuery.isLoading ? <div className="mt-6"><Loading text="Loading approved programmes and patient fee..." compact /></div> : quoteQuery.isError ? <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{requestError(quoteQuery.error)}</div> : (
          <>
            <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Approved programmes ({programs.length})</p>
                  <div className="mt-3 space-y-2">
                    {programs.map((program, index) => (
                      <div key={text(program.id || program._id, String(index))} className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
                        <p className="text-sm font-bold text-neutral-950">{text(program.name, 'Rehabilitation programme')}</p>
                        <p className="mt-1 text-xs text-neutral-500">{program.durationDays ? `${text(program.durationDays)} days` : 'Duration as prescribed'}{program.programCode ? ` · ${text(program.programCode)}` : ''}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-neutral-600">
                    Fee decided by: <span className="font-semibold text-neutral-900">{isDirect ? 'PhysioQR Admin' : text(doctor.fullName, 'Referring Doctor')}</span>
                  </p>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">The fee is for the patient rehabilitation access. Individual programmes do not have separate prices.</p>
                </div>
                <div className="shrink-0 sm:text-right"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Patient fee</p><p className="mt-1 text-2xl font-bold text-primary-700">{formatCurrency(payable)}</p><p className="mt-1 text-xs text-neutral-500">Covers all approved programmes</p></div>
              </div>
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0"/><span>Rehabilitation access unlocks only after the backend verifies payment and activates every approved programme.</span></div>
            {paymentMutation.isError && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{requestError(paymentMutation.error)}</div>}
            <button type="button" disabled={paymentMutation.isPending || !paymentReady} onClick={() => paymentMutation.mutate()} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-bold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">{paymentMutation.isPending ? <><LoaderCircle className="h-4 w-4 animate-spin"/>Processing...</> : <><CreditCard className="h-4 w-4"/>Pay {formatCurrency(payable)} & Activate {programs.length > 1 ? `${programs.length} Programmes` : 'Programme'}</>}</button>
          </>
        )}
      </section>
    </div>
  );
}

function Loading({text:label,compact=false}:{text:string;compact?:boolean}){return <div className={`flex items-center justify-center gap-2 text-sm font-semibold text-neutral-500 ${compact?'py-4':'min-h-[50vh]'}`}><LoaderCircle className="h-4 w-4 animate-spin"/>{label}</div>}
function Message({title,body,action,onAction}:{title:string;body:string;action?:string;onAction?:()=>void}){return <div className="mx-auto max-w-2xl py-8"><section className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8"><h1 className="text-xl font-bold text-neutral-950">{title}</h1><p className="mt-2 text-sm leading-6 text-neutral-600">{body}</p>{action&&onAction&&<button type="button" onClick={onAction} className="mt-5 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white">{action}</button>}</section></div>}
function loadRazorpayScript(){return new Promise<void>((resolve,reject)=>{if(window.Razorpay)return resolve();const existing=document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');if(existing){existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',()=>reject(new Error('Unable to load Razorpay checkout.')),{once:true});return;}const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;script.onload=()=>resolve();script.onerror=()=>reject(new Error('Unable to load Razorpay checkout.'));document.body.appendChild(script);})}
function openRazorpayCheckout({order,patient,onVerify}:{order:ApiRecord;patient:ApiRecord;onVerify:(payload:{razorpay_order_id:string;razorpay_payment_id:string;razorpay_signature:string})=>Promise<void>}){return new Promise<void>((resolve,reject)=>{const RazorpayConstructor=window.Razorpay;if(!RazorpayConstructor)return reject(new Error('Razorpay checkout script is not loaded.'));const checkout=new RazorpayConstructor({key:order.key,amount:order.amount,currency:order.currency||'INR',name:'PhysioQR',description:'Digital rehabilitation access',order_id:order.orderId,prefill:{name:text(patient.fullName||patient.name),contact:text(patient.mobile),email:text(patient.email)},handler:async(response:ApiRecord)=>{try{await onVerify({razorpay_order_id:text(response.razorpay_order_id),razorpay_payment_id:text(response.razorpay_payment_id),razorpay_signature:text(response.razorpay_signature)});resolve();}catch(error){reject(error);}},modal:{ondismiss:()=>reject(new Error('Payment cancelled'))}});checkout.open();})}
function asRecord(value:unknown):ApiRecord{return value&&typeof value==='object'&&!Array.isArray(value)?value as ApiRecord:{}}
function asRecordArray(value:unknown):ApiRecord[]{return Array.isArray(value)?value.map(asRecord).filter((item)=>Object.keys(item).length>0):[]}
function text(value:unknown,fallback=''){return value===undefined||value===null||value===''?fallback:String(value)}
function requestError(error:unknown){const response=asRecord(asRecord(error).response);const data=asRecord(response.data);return text(data.message||asRecord(error).message,'Request failed. Please try again.')}
