const { extractYouTubeVideoId } = require('../utils/youtubeVideoUrl');
const { isDemoExerciseVideo, DEMO_VIDEO_ID, LEGACY_DEMO_VIDEO_ID } = require('./demoExerciseVideo.service');

// Reason codes are safe to show to patients; no unreviewed URL is returned.
const videoStatusForExercise = (exercise) => {
  if (!exercise) return 'missing';
  if (exercise.videoCandidateReviewPending === true) return 'awaiting_clinical_review';
  if (isDemoExerciseVideo(exercise)) return 'demo_only';
  const savedId = String(exercise.youtubeVideoId || '').trim();
  const url = String(exercise.videoUrl || '').trim();
  const urlId = extractYouTubeVideoId(url);
  if (!savedId && !url) return 'missing';
  if (url && !urlId) return 'invalid_link';
  if (savedId && !/^[A-Za-z0-9_-]{11}$/.test(savedId)) return 'invalid_link';
  if (savedId && urlId && savedId !== urlId) return 'invalid_link';
  const id = urlId || savedId;
  if (!id) return 'invalid_link';
  if ([DEMO_VIDEO_ID, LEGACY_DEMO_VIDEO_ID].includes(id)) return 'demo_only';
  return 'ready';
};

const summarizeDayVideoStatus = (exerciseEntries) => {
  const statuses = (exerciseEntries || []).map((entry) => videoStatusForExercise(entry.exercise));
  const counts = {
    ready: statuses.filter((status) => status === 'ready').length,
    awaitingClinicalReview: statuses.filter((status) => status === 'awaiting_clinical_review').length,
    demoOnly: statuses.filter((status) => status === 'demo_only').length,
    missing: statuses.filter((status) => status === 'missing').length,
    invalidLink: statuses.filter((status) => status === 'invalid_link').length,
  };
  return { ...counts, total: statuses.length };
};

module.exports = { videoStatusForExercise, summarizeDayVideoStatus };
