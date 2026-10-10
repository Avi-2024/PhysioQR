const test = require('node:test');
const assert = require('node:assert/strict');
const { ProgramDay } = require('../src/models/Exercise.model');
const { days, exercises } = require('../src/data/generalKnee30DayDraft');
const { inspectProgrammeRelease, getProgrammeReleaseReadiness, ensureApprovedRelease } =
  require('../src/services/programmeReleaseGate.service');

const commonTime = new Date('2026-09-30T00:00:00Z');
const signedTime = new Date('2026-10-01T00:00:00Z');
const program = {
  _id: 'programme', painCategory: 'knee', durationDays: 30,
  clinicalApprovalRequired: true,
  clinicalApproval: { clinicianName: 'Real Reviewer', approvedAt: signedTime },
};

const makeDays = ({ ready = false } = {}) => {
  const byKey = new Map(exercises.map((exercise, i) => [exercise.key, {
    _id: String(i + 1), name: exercise.name, isActive: ready,
    videoUrl: ready ? 'https://www.youtube.com/watch?v=ABCDEFGHIJK' : '',
    safetyInstructions: exercise.safety, painCategory: 'knee',
    sets: exercise.sets, repetitions: exercise.repetitions, updatedAt: commonTime,
  }]));
  return days.map((day) => ({
    dayNumber: day.dayNumber, updatedAt: commonTime,
    exercises: day.items.map((entry) => ({
      exercise: byKey.get(entry.key), sets: entry.sets, repetitions: entry.repetitions,
    })),
  }));
};

test('repeated day errors are grouped into 15 actionable exercises', async () => {
  const originalFind = ProgramDay.find;
  ProgramDay.find = () => ({ populate: () => ({ lean: async () => makeDays() }) });
  try {
    const readiness = await inspectProgrammeRelease(program);
    assert.equal(readiness.issues.length, 224);
    assert.equal(readiness.exercises.length, 15);
    assert.equal(readiness.exercises.filter((item) => item.ready).length, 0);
    assert.equal(readiness.configuredDays, 30);
    assert.equal(readiness.missingDays.length, 0);
    assert.equal(readiness.exercises.every((item) => !item.videoReady && !item.active), true);
    assert.equal((await getProgrammeReleaseReadiness(program)).length, 224);
  } finally {
    ProgramDay.find = originalFind;
  }
});

test('all 30 days can pass only with reviewed active exercises and real videos', async () => {
  const originalFind = ProgramDay.find;
  const configuredDays = makeDays({ ready: true });
  ProgramDay.find = () => ({ populate: () => ({ lean: async () => configuredDays }) });
  try {
    assert.equal((await inspectProgrammeRelease(program)).issues.length, 0);
    await assert.doesNotReject(ensureApprovedRelease(program));
    configuredDays[0].exercises[0].exercise.videoUrl = '';
    await assert.rejects(ensureApprovedRelease(program), /has no video/);
    configuredDays[0].exercises[0].exercise.videoUrl = 'https://youtu.be/ABCDEFGHIJK';
    configuredDays[0].updatedAt = new Date('2026-10-03T00:00:00Z');
    await assert.rejects(ensureApprovedRelease(program), /changed after clinical sign-off/);
  } finally {
    ProgramDay.find = originalFind;
  }
});
