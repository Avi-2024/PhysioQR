import React from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Heart,
  QrCode,
} from 'lucide-react';
import { UserRole } from '../types/landing.types';

interface HeroSectionProps {
  onOpenPortal: (role?: UserRole) => void;
}

const trustItems = ['Secure & private', 'WhatsApp reminders', 'Progress tracked'];

export function HeroSection({ onOpenPortal }: HeroSectionProps) {
  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden border-b border-[#dcebe8] bg-[linear-gradient(115deg,#f8fcfb_0%,#f5fbfa_52%,#e9f8f5_100%)] py-14 sm:py-16 lg:py-20">
      <div className="pointer-events-none absolute right-[7%] top-[16%] h-[430px] w-[430px] rounded-full bg-[#d9f5ef]/55 blur-3xl" />

      <div className="rc-container relative z-10">
        <div className="grid items-center gap-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <div className="max-w-[650px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e9e6] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#178f82] shadow-sm backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-[#20b8a6] shadow-[0_0_0_4px_rgba(32,184,166,0.12)]" />
              QR-based physiotherapy platform
            </div>

            <h1 className="mt-7 max-w-[650px] text-[44px] font-extrabold leading-[1.08] tracking-[-0.045em] text-[#123f3b] sm:text-[54px] lg:text-[62px]">
              Recover faster with a plan designed by your doctor.
            </h1>

            <p className="mt-7 max-w-[610px] text-base leading-7 text-[#66817d] sm:text-[17px]">
              Scan your doctor&apos;s QR code, complete a quick assessment, and unlock a personalized video-based recovery program.
            </p>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => onOpenPortal('patient')}
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#10aa94] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(16,170,148,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0e9986]"
              >
                Start Your Recovery
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
              {trustItems.map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs font-semibold text-[#718985]">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#dff5ef] text-[#13a48f]">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[500px] lg:mx-0 lg:justify-self-end">
            <div className="absolute -inset-8 rounded-full bg-[#ccefe8]/45 blur-3xl" />

            <div className="relative rounded-[28px] border border-white/90 bg-white/85 p-6 shadow-[0_24px_70px_rgba(30,96,86,0.13)] backdrop-blur sm:p-7">
              <div className="text-xs font-semibold text-[#7d9994]">Welcome to</div>
              <div className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-[#214e49]">PhysioQR</div>

              <div className="mt-6 flex items-center gap-4 rounded-2xl border border-[#e0ece9] bg-[#fbfefd] p-4 shadow-[0_8px_20px_rgba(38,91,83,0.04)] sm:p-5">
                <div className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white text-[#13a48f] shadow-[0_5px_16px_rgba(31,113,101,0.12)]">
                  <QrCode className="h-11 w-11" strokeWidth={2.2} />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-[#345f5a]">Scan Doctor QR</div>
                  <div className="mt-1 text-xs text-[#8aa09d]">Start your physiotherapy program</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-[#154f48] p-4 text-white shadow-[0_10px_24px_rgba(21,79,72,0.15)]">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#d8eeea]">Your Recovery Progress</span>
                  <span className="text-sm font-extrabold">72%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full w-[72%] rounded-full bg-[linear-gradient(90deg,#39d1bd,#8ce8db)]" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#e3eeec] bg-white p-4">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-[#9aadaa]">Today&apos;s Exercise</div>
                  <div className="mt-1 truncate text-sm font-extrabold text-[#365f5a]">Lower Back Stretch</div>
                  <div className="mt-1 text-[11px] text-[#8aa09d]">10 minutes</div>
                </div>
                <button type="button" onClick={() => onOpenPortal('patient')} className="rounded-lg bg-[#e0f5ef] px-4 py-2 text-xs font-extrabold text-[#149582]">
                  Start
                </button>
              </div>
            </div>

            <div className="absolute -right-4 top-5 hidden items-center gap-3 rounded-2xl border border-white bg-white/95 px-4 py-3 shadow-[0_12px_30px_rgba(27,88,79,0.12)] sm:flex lg:-right-10">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#1bad98] text-white">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <div className="text-xs font-extrabold text-[#3b615c]">Verified Program</div>
                <div className="mt-0.5 text-[10px] text-[#91a5a2]">Designed by experts</div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-2xl border border-white bg-white/95 px-4 py-3 shadow-[0_12px_30px_rgba(27,88,79,0.12)] sm:flex lg:-left-16">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0f2] text-[#ef7180]">
                <Heart className="h-4 w-4 fill-current" />
              </span>
              <div>
                <div className="text-sm font-extrabold text-[#3b615c]">1,200+</div>
                <div className="text-[10px] text-[#91a5a2]">Patients Helped</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
