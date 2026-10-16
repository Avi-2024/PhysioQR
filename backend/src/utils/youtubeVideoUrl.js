// Shared validation for all supported YouTube exercise link formats.
// Query parameters (including ?si= on youtu.be shares) are allowed, but
// only an actual 11-character video ID from an approved YouTube host is valid.
const extractYouTubeVideoId = (input) => {
  if (typeof input !== 'string' || !input.trim()) return null;
  try {
    const url = new URL(input.trim());
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    const path = url.pathname.split('/').filter(Boolean);
    let id = null;
    if (['youtu.be', 'www.youtu.be'].includes(host)) {
      if (path.length === 1) id = path[0];
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
      if (path.length === 1 && path[0] === 'watch') id = url.searchParams.get('v');
      else if (path.length === 2 && ['shorts', 'embed', 'live'].includes(path[0])) id = path[1];
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
};

const isValidYouTubeVideoUrl = (input) => extractYouTubeVideoId(input) !== null;

module.exports = { extractYouTubeVideoId, isValidYouTubeVideoUrl };
