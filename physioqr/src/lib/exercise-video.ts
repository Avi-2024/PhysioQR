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
