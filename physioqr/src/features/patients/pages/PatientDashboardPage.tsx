import { useQuery } from '@tanstack/react-query';
import { Activity, CalendarDays, Clock3 } from 'lucide-react';
import apiClient from '@/lib/api-client';
import PatientProgrammePage from '@/features/patients/pages/program/PatientProgrammePage';

type ApiRecord = Record<string, unknown>;

// Patient home is prescription-first, while keeping the existing live programme
// endpoint active for status/progress/expiry data used across the portal.
export default function PatientDashboardPage() {
  const programQuery = useQuery({
    queryKey: ['patient-program'],
    queryFn: async () => (await apiClient.get('/patients/me/program')).data,
    retry: false,
  });

  const program = asRecord(programQuery.data);
  const rehabProgram = asRecord(program.program);
  const currentDay = Math.max(1, Number(program.currentDay || 1));
  const completion = Math.min(Math.max(Number(program.completionPercentage || 0), 0), 100);
  const durationDays = Number(rehabProgram.durationDays || 0);

  return (
    <div className="space-y-5">
      {!programQuery.isLoading && !programQuery.isError && Object.keys(program).length > 0 && (
        <section className="grid gap-3 sm:grid-cols-3 print:hidden">
          <DashboardStat
            icon={CalendarDays}
            label="Current day"
            value={durationDays ? `Day ${currentDay} of ${durationDays}` : `Day ${currentDay}`}
          />
          <DashboardStat
            icon={Activity}
            label="Overall progress"
            value={`${completion}% complete`}
            progress={completion}
          />
          <DashboardStat
            icon={Clock3}
            label="Access"
            value={expiryText(program.expiryDate)}
          />
        </section>
      )}

      {programQuery.isError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800 print:hidden">
          Your prescription is available below. Live recovery summary could not be refreshed right now.
        </div>
      )}

      <PatientProgrammePage />
    </div>
  );
}

function DashboardStat({
  icon: Icon,
  label,
  value,
  progress,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  progress?: number;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
        <Icon className="h-4 w-4 text-primary-600" />
        {label}
      </div>
      <div className="mt-2 text-sm font-bold text-neutral-950">{value}</div>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-primary-600" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as ApiRecord : {};
}

function expiryText(value: unknown) {
  if (!value) return 'Active rehabilitation access';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'Active rehabilitation access';
  return `Until ${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
}
