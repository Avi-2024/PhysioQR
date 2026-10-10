// Release gate for programmes explicitly requiring clinical approval.
// Legacy programmes do not enter this process automatically.
const { ProgramDay } = require('../models/Exercise.model');

const videoConfigured = (exercise) =>
  Boolean(String(exercise?.videoUrl || '').trim() || String(exercise?.youtubeVideoId || '').trim());

const getProgrammeReleaseReadiness = async (program, { checkApprovalFreshness = false } = {}) => {
  const issues = [];
  if (!program) return ['Programme not found'];
  if (!program.clinicalApprovalRequired) return issues;

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
    if (daysByNumber.has(day.dayNumber)) issues.push(`Day ${day.dayNumber}: duplicate active day`);
    daysByNumber.set(day.dayNumber, day);
  }
  for (let n = 1; n <= program.durationDays; n += 1) {
    const day = daysByNumber.get(n);
    if (!day) { issues.push(`Day ${n}: not configured`); continue; }
    if (!day.exercises?.length) { issues.push(`Day ${n}: no exercises assigned`); continue; }
    for (const entry of day.exercises) {
      const exercise = entry.exercise;
      if (!exercise) { issues.push(`Day ${n}: missing exercise reference`); continue; }
      if (exercise.isActive !== true) issues.push(`Day ${n}: exercise "${exercise.name}" is inactive`);
      if (!videoConfigured(exercise)) issues.push(`Day ${n}: exercise "${exercise.name}" has no video`);
      if (!String(exercise.safetyInstructions || '').trim()) issues.push(`Day ${n}: exercise "${exercise.name}" needs safety instructions`);
      if (String(exercise.painCategory?._id || exercise.painCategory || '') !== String(program.painCategory?._id || program.painCategory)) issues.push(`Day ${n}: exercise "${exercise.name}" is mapped to another body region`);
      const sets = entry.sets ?? exercise.sets;
      const reps = entry.repetitions ?? exercise.repetitions;
      if (!Number.isInteger(Number(sets)) || Number(sets) < 1 ||
          !Number.isInteger(Number(reps)) || Number(reps) < 1) {
        issues.push(`Day ${n}: exercise "${exercise.name}" needs valid sets/reps`);
      }
    }
  }
  return issues;
};

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

module.exports = { videoConfigured, getProgrammeReleaseReadiness, ensureApprovedRelease };
