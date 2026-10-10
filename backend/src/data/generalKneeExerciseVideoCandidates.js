// Publicly discoverable candidate demonstrations for the General Knee 30-day
// DRAFT only, collected from providers' named exercise pages/videos.
// The matching EXERCISE name is not proof that the demonstration, intensity,
// presenter permission, embedding, or clinical appropriateness has been reviewed.
// Do not use this file to release a patient programme. Candidates are stored
// as isDemoVideo=true pending a real physiotherapist review and sign-off.
// Existing unrelated programmes and confirmed real exercise links are untouched.
const SOURCE_PAGE_NHS = 'https://www.kingstonandrichmond.nhs.uk/services/service-search-z/physiotherapy-msk-richmond';
const CANDIDATES = Object.freeze({
  quad_set: Object.freeze({
    youtubeVideoId: '26hnV630E3Q',
    videoUrl: 'https://www.youtube.com/watch?v=26hnV630E3Q',
    videoTitle: "Isometric Quadriceps Contraction",
    provider: "Kingston & Richmond NHS",
    sourcePage: SOURCE_PAGE_NHS,
  }),
  heel_slide: Object.freeze({
    youtubeVideoId: 'c-gRSlCfNZE',
    videoUrl: 'https://www.youtube.com/watch?v=c-gRSlCfNZE',
    videoTitle: "Heel Slides in Supine",
    provider: "MSK Medicine",
    sourcePage: "https://www.youtube.com/watch?v=c-gRSlCfNZE",
  }),
  seated_extension: Object.freeze({
    youtubeVideoId: 'HB0hHrXwImI',
    videoUrl: 'https://www.youtube.com/watch?v=HB0hHrXwImI',
    videoTitle: "Seated knee extension",
    provider: "The Rotherham NHS Foundation Trust",
    sourcePage: "https://www.youtube.com/watch?v=HB0hHrXwImI",
  }),
  straight_leg_raise: Object.freeze({
    youtubeVideoId: 'cohSTgZKJjs',
    videoUrl: 'https://www.youtube.com/watch?v=cohSTgZKJjs',
    videoTitle: "Straight Leg Raise",
    provider: "Kingston & Richmond NHS",
    sourcePage: SOURCE_PAGE_NHS,
  }),
  heel_raise: Object.freeze({
    youtubeVideoId: 'Ud_VaRFGRsY',
    videoUrl: 'https://www.youtube.com/watch?v=Ud_VaRFGRsY',
    videoTitle: "Double Legged Heel Raise / Single Leg Heel Raise",
    provider: "Kingston & Richmond NHS",
    sourcePage: SOURCE_PAGE_NHS,
  }),
  hamstring_curl: Object.freeze({
    youtubeVideoId: 'k4TDxANOD4M',
    videoUrl: 'https://www.youtube.com/watch?v=k4TDxANOD4M',
    videoTitle: "Standing Knee Flexion",
    provider: "Kingston & Richmond NHS",
    sourcePage: SOURCE_PAGE_NHS,
  }),
  hip_abduction: Object.freeze({
    youtubeVideoId: '9f7KVxlNe7A',
    videoUrl: 'https://www.youtube.com/watch?v=9f7KVxlNe7A',
    videoTitle: "Side Lying Hip Abduction",
    provider: "Kingston & Richmond NHS",
    sourcePage: SOURCE_PAGE_NHS,
  }),
  sit_to_stand: Object.freeze({
    youtubeVideoId: '-w4DXEG-E7M',
    videoUrl: 'https://www.youtube.com/watch?v=-w4DXEG-E7M',
    videoTitle: "Sit to Stand",
    provider: "Kingston & Richmond NHS",
    sourcePage: SOURCE_PAGE_NHS,
  }),
  mini_squat: Object.freeze({
    youtubeVideoId: 'nKf8HIHJv2E',
    videoUrl: 'https://www.youtube.com/watch?v=nKf8HIHJv2E',
    videoTitle: "Supported Squat",
    provider: "Kingston & Richmond NHS",
    sourcePage: SOURCE_PAGE_NHS,
  }),
  step_up: Object.freeze({
    youtubeVideoId: 'wOoGczWEUoE',
    videoUrl: 'https://www.youtube.com/watch?v=wOoGczWEUoE',
    videoTitle: "Step Ups",
    provider: "Kingston & Richmond NHS",
    sourcePage: SOURCE_PAGE_NHS,
  }),
  weight_shift: Object.freeze({
    youtubeVideoId: 'LUd57n5RGTA',
    videoUrl: 'https://www.youtube.com/watch?v=LUd57n5RGTA',
    videoTitle: "Standing Weight Shifts",
    provider: "Vital Rehab Physical Therapy",
    sourcePage: "https://www.youtube.com/watch?v=LUd57n5RGTA",
  }),
  tandem_stance: Object.freeze({
    youtubeVideoId: 'qcYMv5dDr44',
    videoUrl: 'https://www.youtube.com/watch?v=qcYMv5dDr44',
    videoTitle: "Balance Exercises (Tandem Stand / Single Leg Stand)",
    provider: "Kingston & Richmond NHS",
    sourcePage: SOURCE_PAGE_NHS,
  }),
  bridge: Object.freeze({
    youtubeVideoId: 'WK-5Pb9nNwQ',
    videoUrl: 'https://www.youtube.com/watch?v=WK-5Pb9nNwQ',
    videoTitle: "Double Legged Bridge",
    provider: "Kingston & Richmond NHS",
    sourcePage: SOURCE_PAGE_NHS,
  }),
  calf_stretch: Object.freeze({
    youtubeVideoId: 'uuVyVuSbXrA',
    videoUrl: 'https://www.youtube.com/watch?v=uuVyVuSbXrA',
    videoTitle: "Standing calf stretch",
    provider: "NHS inform",
    sourcePage: "https://www.youtube.com/watch?v=uuVyVuSbXrA",
  }),
  hamstring_stretch: Object.freeze({
    youtubeVideoId: 'Cg6sXCuvgyw',
    videoUrl: 'https://www.youtube.com/watch?v=Cg6sXCuvgyw',
    videoTitle: "Seated Hamstring Stretch Demonstrated by Physiotherapist Ami",
    provider: "SOS Physiotherapy",
    sourcePage: "https://www.youtube.com/watch?v=Cg6sXCuvgyw",
  }),
});
const validateCandidates = (knownExerciseKeys) => {
  const keys = Object.keys(CANDIDATES);
  const ids = keys.map((key) => CANDIDATES[key].youtubeVideoId);
  const errors = [];
  if (keys.length !== 15) errors.push('Expected exactly 15 candidate exercises');
  if (new Set(ids).size !== ids.length) errors.push('Every exercise needs a different video ID');
  if (knownExerciseKeys) {
    const known = new Set(knownExerciseKeys);
    for (const key of keys) if (!known.has(key)) errors.push('Unknown exercise: ' + key);
    for (const key of known) if (!CANDIDATES[key]) errors.push('Missing candidate for: ' + key);
  }
  keys.forEach((key) => {
    const video = CANDIDATES[key];
    if (!/^[A-Za-z0-9_-]{11}$/.test(video.youtubeVideoId)) errors.push('Bad video ID: ' + key);
    if (!video.sourcePage || !video.provider || !video.videoTitle) errors.push('Missing source details: ' + key);
  });
  return errors;
};
module.exports = { CANDIDATES, validateCandidates };
