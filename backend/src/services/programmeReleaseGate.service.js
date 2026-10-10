// Release gate for programmes explicitly requiring clinical approval.
// Legacy programmes do not enter this process automatically.
const { ProgramDay } = require('../models/Exercise.model');

const videoConfigured = (exercise) => {
  const videoId = String(exercise?.youtubeVideoId || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(videoId)) return true;
  try {
    const url = new URL(String(exercise?.videoUrl || '').trim());
    if (!['https:', 'http:'].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    const path = url.pathname.split('/').filter(Boolean);
    let id = '';
    if (host === 'youtu.be' || host === 'www.youtu.be') id = path[0] || '';
    else if (['youtube.com','www.youtube.com','m.youtube.com'].includes(host)) {
      id = path[0] === 'watch' ? url.searchParams.get('v') || ''
        : ['embed', 'shorts', 'live'].includes(path[0]) ? path[1] || '' : '';
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id);
  } catch {
    return false;
  }
};

// Keep the detailed safety gate and the Admin checklist in sync.
// Issue counts are per assignment; the checklist groups unique exercises.
const inspectProgrammeRelease = async (program, { checkApprovalFreshness = false } = {}) => {
  const issues = [];
  const checklist = new Map();
  const missingDays = [];
  if (!program) return { issues: ['Programme not found'], exercises: [], missingDays, configuredDays: 0, requiredDays: 0 };
  if (!program.clinicalApprovalRequired) return { issues, exercises: [], missingDays, configuredDays: 0, requiredDays: program.durationDays || 0 };

  const days = await ProgramDay.find({ program: program._id, isActive: true })
    .populate('exercises.exercise',
      '_id name isActive videoUrl youtubeVideoId safetyInstructions sets repetitions painCategory updatedAt')
    .lean();

  if (checkApprovalFreshness && program.clinicalApproval?.approvedAt) {
    const approvedAt = new Date(program.clinicalApproval.approvedAt).getTime();
    const changedAfterApproval = days.some((day) =>
      new Date(day.updatedAt || 0).getTime() > approvedAt
      || (day.exercises || []).some((entry) =>
        entry.exercise && new Date(entry.exercise.updatedAt || 0).getTime() > approvedAt));
    if (changedAfterApproval) {
      issues.push('Day configuration or exercise library content changed after clinical sign-off. Record a new clinician review.');
    }
  }
  const daysByNumber = new Map();
  for (const day of days) {
    if (daysByNumber.has(day.dayNumber)) issues.push('Day ' + day.dayNumber + ': duplicate active day');
    daysByNumber.set(day.dayNumber, day);
  }
  for (let n = 1; n <= program.durationDays; n += 1) {
    const day = daysByNumber.get(n);
    if (!day) { issues.push('Day ' + n + ': not configured'); missingDays.push(n); continue; }
    if (!day.exercises?.length) { issues.push('Day ' + n + ': no exercises assigned'); missingDays.push(n); continue; }
    for (const entry of day.exercises) {
      const exercise = entry.exercise;
      if (!exercise) { issues.push('Day ' + n + ': missing exercise reference'); continue; }
      const id = String(exercise._id);
      const active = exercise.isActive === true;
      const videoReady = videoConfigured(exercise);
      const safetyReady = Boolean(String(exercise.safetyInstructions || '').trim());
      const categoryReady = String(exercise.painCategory?._id || exercise.painCategory || '') === String(program.painCategory?._id || program.painCategory);
      const sets = entry.sets ?? exercise.sets;
      const reps = entry.repetitions ?? exercise.repetitions;
      const doseReady = Number.isInteger(Number(sets)) && Number(sets) >= 1
        && Number.isInteger(Number(reps)) && Number(reps) >= 1;
      if (!active) issues.push('Day ' + n + ': exercise "' + exercise.name + '" is inactive');
      if (!videoReady) issues.push('Day ' + n + ': exercise "' + exercise.name + '" has no video');
      if (!safetyReady) issues.push('Day ' + n + ': exercise "' + exercise.name + '" needs safety instructions');
      if (!categoryReady) issues.push('Day ' + n + ': exercise "' + exercise.name + '" is mapped to another body region');
      if (!doseReady) issues.push('Day ' + n + ': exercise "' + exercise.name + '" needs valid sets/reps');
      if (!checklist.has(id)) checklist.set(id, {
        id, name: exercise.name, active, videoReady, safetyReady,
        categoryReady, doseReady: true, usedOnDays: [],
      });
      const row = checklist.get(id);
      row.active = row.active && active;
      row.videoReady = row.videoReady && videoReady;
      row.safetyReady = row.safetyReady && safetyReady;
      row.categoryReady = row.categoryReady && categoryReady;
      row.doseReady = row.doseReady && doseReady;
      if (!row.usedOnDays.includes(n)) row.usedOnDays.push(n);
    }
  }
  return {
    issues,
    exercises: [...checklist.values()].map((row) => ({
      ...row, ready: row.active && row.videoReady && row.safetyReady && row.categoryReady && row.doseReady,
    })).sort((a, b) => a.name.localeCompare(b.name)),
    missingDays,
    configuredDays: daysByNumber.size,
    requiredDays: program.durationDays,
  };
};

const getProgrammeReleaseReadiness = async (program, options) =>
  (await inspectProgrammeRelease(program, options)).issues;

const ensureApprovedRelease = async (program) => {
  if (!program?.clinicalApprovalRequired) return;
  if (!program.clinicalApproval?.approvedAt || !String(program.clinicalApproval?.clinicianName || '').trim()) {
    const error = new Error('Clinical sign-off required before this draft programme can be published');
    error.status = 409;
    throw error;
  }
  const issues = await getProgrammeReleaseReadiness(program, { checkApprovalFreshness: true });
  if (issues.length) {
    const error = new Error('Draft programme is not ready: ' + issues.slice(0, 4).join('; ') + (issues.length > 4 ? ` (+${issues.length-4} more)` : ''));
    error.status = 409;
    throw error;
  }
};

module.exports = { videoConfigured, inspectProgrammeRelease, getProgrammeReleaseReadiness, ensureApprovedRelease };
