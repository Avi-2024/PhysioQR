// Keep the patient player aligned with backend/src/utils/youtubeVideoUrl.js.
// YouTube watch links can have "v" anywhere in their query string.
export function extractYouTubeVideoId(input: unknown): string {
  if (typeof input !== 'string' || !input.trim()) return '';
  try {
    const url = new URL(input.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean);
    let id = '';
    if ((host === 'youtu.be' || host === 'www.youtu.be') && parts.length === 1) {
      id = parts[0];
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
      if (parts.length === 1 && parts[0] === 'watch') id = url.searchParams.get('v') || '';
      else if (parts.length === 2 && ['embed', 'shorts', 'live'].includes(parts[0])) id = parts[1];
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
  } catch {
    return '';
  }
}

export function getExerciseYouTubeId(exercise: { youtubeVideoId?: unknown; videoUrl?: unknown }): string {
  const savedId = typeof exercise.youtubeVideoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(exercise.youtubeVideoId)
    ? exercise.youtubeVideoId : '';
  const videoUrl = typeof exercise.videoUrl === 'string' ? exercise.videoUrl.trim() : '';
  const urlId = extractYouTubeVideoId(videoUrl);
  // A conflicting saved ID should not accidentally show another exercise's video.
  if (savedId && urlId && savedId !== urlId) return '';
  if (videoUrl && !urlId) return '';
  return urlId || savedId;
}

export type PatientVideoAvailability = {
  total?: number;
  ready?: number;
  awaitingClinicalReview?: number;
  demoOnly?: number;
  missing?: number;
  invalidLink?: number;
};

// Patient-safe reasons; never link directly to an unreviewed demonstration.
export function getVideoAvailabilityMessage(status?: PatientVideoAvailability): string {
  if (!status || (status.ready || 0) > 0) return '';
  if ((status.total || 0) === 0) return 'The care team has not assigned any exercises for this day.';
  if ((status.awaitingClinicalReview || 0) > 0) return 'Today\'s exercise video is awaiting clinical review. Please contact your care team.';
  if ((status.demoOnly || 0) > 0) return 'Only testing/demo videos are linked for this day. Your care team must add approved exercise videos.';
  if ((status.invalidLink || 0) > 0) return 'The linked exercise video cannot be played because its YouTube URL needs correction. Please contact your care team.';
  return 'Your care team has not linked an approved exercise video for this day.';
}
