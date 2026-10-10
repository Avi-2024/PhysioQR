// TEST-ONLY YouTube player sample, as used in Google's IFrame API documentation.
// This video is NOT physiotherapy instruction and MUST NOT count as clinically ready.
const DEMO_VIDEO_ID = 'M7lc1UVf-VE';
const DEMO_VIDEO_URL = 'https://www.youtube.com/watch?v=' + DEMO_VIDEO_ID;

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
  String(exercise.youtubeVideoId || '').trim() === DEMO_VIDEO_ID ||
  youtubeId(exercise.videoUrl) === DEMO_VIDEO_ID
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
const installedDemoVideoFilter = () => ({
  isDemoVideo: true,
  videoUrl: DEMO_VIDEO_URL,
  youtubeVideoId: DEMO_VIDEO_ID,
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
  DEMO_VIDEO_ID, DEMO_VIDEO_URL, youtubeId,
  missingDemoVideoFilter, installedDemoVideoFilter,
  isDemoExerciseVideo, patientSafeExercise, patientSafeDay,
};
