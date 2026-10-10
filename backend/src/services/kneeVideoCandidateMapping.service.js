// Clinical-review-pending exercise-specific video candidate assignment.
// Only affects the inactive draft General Knee 30-day programme's 15 seeded
// exercises. NEVER overwrites a genuine uploaded/reviewed video.
const Program = require('../models/Program.model');
const { Exercise } = require('../models/Exercise.model');
const { EXERCISE_PREFIX, PROGRAM_CODE, exercises } = require('../data/generalKnee30DayDraft');
const { CANDIDATES, validateCandidates } = require('../data/generalKneeExerciseVideoCandidates');
const { missingDemoVideoFilter, installedDemoVideoFilter } = require('./demoExerciseVideo.service');

const candidateKeys = exercises.map((item) => item.key);
const exactChangeableFilter = () => ({
  $or: [missingDemoVideoFilter(), installedDemoVideoFilter()],
});

async function assignKneeVideoCandidates({ apply = false } = {}) {
  const errors = validateCandidates(candidateKeys);
  if (errors.length) throw new Error('Invalid source-backed knee video mapping: ' + errors.join('; '));
  if (process.env.NODE_ENV === 'production') {
    const error = new Error('Draft video candidate migration is disabled in production');
    error.status = 403;
    throw error;
  }
  const program = await Program.findOne({ programCode: PROGRAM_CODE }).lean();
  if (!program) {
    const error = new Error('Knee 30-day draft not found. Seed the inactive draft first.');
    error.status = 404;
    throw error;
  }
  if (program.isActive || !program.clinicalApprovalRequired) {
    const error = new Error('Cannot update videos: this programme is active or lacks the clinical release lock');
    error.status = 409;
    throw error;
  }

  const seedKeys = candidateKeys.map((key) => EXERCISE_PREFIX + key);
  const records = await Exercise.find({
    seedKey: { $in: seedKeys }, painCategory: program.painCategory,
  }).select('_id seedKey name videoUrl youtubeVideoId isDemoVideo videoCandidateReviewPending').lean();
  const byKey = new Map(records.map((record) => [record.seedKey, record]));
  const results = [];
  let changed = 0;
  for (const key of candidateKeys) {
    const record = byKey.get(EXERCISE_PREFIX + key);
    const candidate = CANDIDATES[key];
    const currentId = String(record?.youtubeVideoId || '').trim();
    const sameCandidate = currentId === candidate.youtubeVideoId && record?.videoCandidateReviewPending === true;
    const currentDemo = record && (
      (record.videoUrl === 'https://www.youtube.com/watch?v=M7lc1UVf-VE' && currentId === 'M7lc1UVf-VE' && record.isDemoVideo === true)
      || (record.videoUrl === 'https://youtu.be/ml6cT4AZdqI?si=0VwhyxF63Vulcq5Z' && currentId === 'ml6cT4AZdqI' && record.isDemoVideo === true)
    );
    const blank = record && !String(record.videoUrl || '').trim() && !currentId;
    const eligible = Boolean(record && (blank || currentDemo));
    let status = !record ? 'missing' : sameCandidate ? 'already_added' : eligible ? 'ready_to_update' : 'preserved_existing';
    if (apply && eligible) {
      // Concurrency guard: a real video entered while this job runs wins.
      const update = await Exercise.updateOne({
        _id: record._id, seedKey: EXERCISE_PREFIX + key,
        ...exactChangeableFilter(),
      }, { $set: {
        videoUrl: candidate.videoUrl,
        youtubeVideoId: candidate.youtubeVideoId,
        isDemoVideo: true, // critical: no patient playback / release until review
        videoCandidateReviewPending: true,
        videoCandidateTitle: candidate.videoTitle,
        videoCandidateProvider: candidate.provider,
        videoCandidateSourcePage: candidate.sourcePage,
      } });
      if (update.modifiedCount) { changed += 1; status = 'added_pending_review'; }
      else status = 'skipped_concurrent_change';
    }
    results.push({
      exerciseKey: key, exerciseName: record?.name || exercises.find((item) => item.key === key)?.name,
      videoUrl: candidate.videoUrl, videoTitle: candidate.videoTitle,
      source: candidate.provider, status,
    });
  }
  return {
    programmeCode: PROGRAM_CODE,
    totalCandidates: candidateKeys.length,
    changed, missing: results.filter((item) => item.status === 'missing').length,
    preserved: results.filter((item) => item.status === 'preserved_existing').length,
    pendingReview: true,
    patientProgrammePublished: false,
    items: results,
  };
}

module.exports = { assignKneeVideoCandidates, exactChangeableFilter };
