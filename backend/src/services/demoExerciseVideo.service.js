// Test-only video for Admin playback testing. A single link repeated across
// unrelated exercises is not a reviewed exercise tutorial or a prescription.
// Keep historical demo IDs marked as demo even after changing the sample URL.
const DEMO_VIDEO_ID = 'ml6cT4AZdqI';
const DEMO_VIDEO_URL = 'https://youtu.be/ml6cT4AZdqI?si=0VwhyxF63Vulcq5Z';
const LEGACY_DEMO_VIDEO_ID = 'M7lc1UVf-VE';
const LEGACY_DEMO_VIDEO_URL = 'https://www.youtube.com/watch?v=M7lc1UVf-VE';
const DEMO_IDS = new Set([DEMO_VIDEO_ID, LEGACY_DEMO_VIDEO_ID]);

const youtubeId = (value) => {
  try {
    const url = new URL(String(value || '').trim());
    const host = url.hostname.toLowerCase();
    if (host === 'youtu.be' || host === 'www.youtu.be') return url.pathname.split('/')[1] || '';
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
      if (url.pathname === '/watch') return url.searchParams.get('v') || '';
      const segments = url.pathname.split('/').filter(Boolean);
      return ['shorts','embed','live'].includes(segments[0]) ? segments[1] || '' : '';
    }
  } catch {
    return '';
  }
  return '';
};

const isDemoExerciseVideo = (exercise) => Boolean(exercise && (
  exercise.isDemoVideo === true ||
  DEMO_IDS.has(String(exercise.youtubeVideoId || '').trim()) ||
  DEMO_IDS.has(youtubeId(exercise.videoUrl))
));

// Same strict selectors for the CLI and Admin's development-only action.
// Both fields must be empty, so an existing real link or ID is never replaced.
const blankVideoField = (field) => ({ $or: [
  { [field]: { $exists: false } },
  { [field]: null },
  { [field]: '' },
] });
const missingDemoVideoFilter = () => ({ $and: [
  blankVideoField('videoUrl'),
  blankVideoField('youtubeVideoId'),
] });
// Exact match protects real videos if an Admin has replaced a URL.
const currentDemoVideoFilter = () => ({
  isDemoVideo: true,
  videoUrl: DEMO_VIDEO_URL,
  youtubeVideoId: DEMO_VIDEO_ID,
});
const legacyDemoVideoFilter = () => ({
  isDemoVideo: true,
  videoUrl: LEGACY_DEMO_VIDEO_URL,
  youtubeVideoId: LEGACY_DEMO_VIDEO_ID,
});
const installedDemoVideoFilter = () => ({
  $or: [currentDemoVideoFilter(), legacyDemoVideoFilter()],
});
// Applies the requested sample to new blank records AND previous sample
// installations, but does not overwrite any non-demo URL.
const pendingDemoVideoFilter = () => ({
  $or: [missingDemoVideoFilter(), legacyDemoVideoFilter()],
});

// Strip test-only video links from every non-Admin programme content response.
// The exercise instructions remain available, but misleading sample videos do not.
const patientSafeExercise = (exercise) => {
  if (!exercise) return exercise;
  const plain = typeof exercise.toObject === 'function' ? exercise.toObject() : exercise;
  if (!isDemoExerciseVideo(plain)) return plain;
  return { ...plain, videoUrl: '', youtubeVideoId: '', thumbnail: '', isDemoVideo: true };
};

const patientSafeDay = (day) => {
  if (!day) return day;
  const plain = typeof day.toObject === 'function' ? day.toObject() : day;
  return {
    ...plain,
    exercises: (plain.exercises || []).map((entry) => ({
      ...(typeof entry.toObject === 'function' ? entry.toObject() : entry),
      exercise: patientSafeExercise(entry.exercise),
    })),
  };
};

module.exports = {
  DEMO_VIDEO_ID, DEMO_VIDEO_URL, LEGACY_DEMO_VIDEO_ID, LEGACY_DEMO_VIDEO_URL, youtubeId,
  missingDemoVideoFilter, installedDemoVideoFilter, pendingDemoVideoFilter,
  isDemoExerciseVideo, patientSafeExercise, patientSafeDay,
};
