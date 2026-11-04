import type { PatientVideoAvailability } from './exercise-video';

export type PatientSessionStatus = 'not_configured' | 'guidance_only' | 'ready';

type SessionData = {
  day?: {
    id?: string | null;
    exercises?: Array<{ exercise?: unknown | null }>;
    videoAvailability?: PatientVideoAvailability;
  } | null;
};

export function getPatientSessionState(data: SessionData | null | undefined) {
  const day = data?.day;
  const exerciseCount = (day?.exercises || []).filter((entry) => Boolean(entry.exercise)).length;
  const readyVideoCount = Math.max(0, Number(day?.videoAvailability?.ready || 0));
  const status: PatientSessionStatus = !day?.id || !exerciseCount
    ? 'not_configured'
    : readyVideoCount > 0 ? 'ready' : 'guidance_only';

  return { status, exerciseCount, readyVideoCount };
}

// Access validity does not add exercise days. Keep the grid limited to the
// clinical programme duration even when patients can replay for 90 days.
export function getExerciseDayNumbers(durationDays: number | undefined, _accessValidityDays?: number): number[] {
  const duration = Number(durationDays || 0);
  if (!Number.isInteger(duration) || duration <= 0) return [];
  return Array.from({ length: Math.min(365, duration) }, (_, index) => index + 1);
}

export type PatientDayTileState = 'completed' | 'today' | 'needs_content' | 'revisit' | 'available_early' | 'locked';

export function getPatientDayTileState({
  dayNumber,
  currentDay,
  unlocked,
  completed,
  currentDayHasContent,
}: {
  dayNumber: number;
  currentDay: number;
  unlocked: boolean;
  completed: boolean;
  currentDayHasContent: boolean;
}): PatientDayTileState {
  if (!unlocked) return 'locked';
  if (completed) return 'completed';
  if (dayNumber === currentDay) return currentDayHasContent ? 'today' : 'needs_content';
  if (dayNumber < currentDay) return 'revisit';
  return 'available_early';
}

export const patientDayTileLabel: Record<PatientDayTileState, string> = {
  completed: 'Replay session',
  today: 'Today',
  needs_content: 'Needs content',
  revisit: 'Revisit day',
  available_early: 'Available early',
  locked: 'Locked',
};
