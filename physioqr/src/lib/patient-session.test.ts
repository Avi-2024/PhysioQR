import { describe, expect, it } from 'vitest';
import { getPatientDayTileState, getPatientSessionState } from './patient-session';

describe('patient exercise-first dashboard', () => {
  it('does not announce a ready session if current day has no exercises', () => {
    expect(getPatientSessionState({ day: { exercises: [], videoAvailability: { ready: 0 } } }).status).toBe('not_configured');
    expect(getPatientSessionState({ day: { id: 'day1', exercises: [] } }).status).toBe('not_configured');
  });

  it('separates text-only guidance from approved video sessions', () => {
    const assigned = [{ exercise: { name: 'Neck extension' } }];
    expect(getPatientSessionState({ day: { id: 'day2', exercises: assigned, videoAvailability: { ready: 0, awaitingClinicalReview: 1 } } }).status).toBe('guidance_only');
    expect(getPatientSessionState({ day: { id: 'day2', exercises: assigned, videoAvailability: { ready: 1 } } })).toEqual({
      status: 'ready', exerciseCount: 1, readyVideoCount: 1,
    });
  });

  it('labels previous days and unlocked future days without claiming they were completed', () => {
    const base = { currentDay: 2, currentDayHasContent: true };
    expect(getPatientDayTileState({ ...base, dayNumber: 1, unlocked: true, completed: true })).toBe('completed');
    expect(getPatientDayTileState({ ...base, dayNumber: 1, unlocked: true, completed: false })).toBe('revisit');
    expect(getPatientDayTileState({ ...base, dayNumber: 2, unlocked: true, completed: false })).toBe('today');
    expect(getPatientDayTileState({ ...base, dayNumber: 3, unlocked: true, completed: false })).toBe('available_early');
    expect(getPatientDayTileState({ ...base, dayNumber: 3, unlocked: false, completed: false })).toBe('locked');
    expect(getPatientDayTileState({ ...base, currentDayHasContent: false, dayNumber: 2, unlocked: true, completed: false })).toBe('needs_content');
  });
});
