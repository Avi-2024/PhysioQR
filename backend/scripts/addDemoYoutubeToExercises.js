// DEV/TEST ONLY: use user-selected YouTube URL as one playback sample.
// Not a verified tutorial for every exercise. No programme is approved.
// Safe explicit npm commands (no npm argument-forwarding dependency):
//   npm run demo:exercise-videos          (read-only preview)
//   npm run demo:exercise-videos:apply    (fill empty + replace legacy demo)
//   npm run demo:exercise-videos:remove   (remove only exact demo links)
require('dotenv').config();
const mongoose = require('mongoose');
const { Exercise } = require('../src/models/Exercise.model');
const {
  DEMO_VIDEO_ID, DEMO_VIDEO_URL,
  missingDemoVideoFilter, installedDemoVideoFilter, pendingDemoVideoFilter,
} = require('../src/services/demoExerciseVideo.service');

const missingVideoFilter = missingDemoVideoFilter();
const applyFilter = pendingDemoVideoFilter();
const demoOnlyFilter = installedDemoVideoFilter();

async function run() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo video migration is forbidden in NODE_ENV=production.');
  }
  const apply = process.argv.includes('--apply');
  const remove = process.argv.includes('--remove');
  if (apply && remove) throw new Error('Use only --apply OR --remove.');
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI missing; load backend/.env first.');
  await mongoose.connect(uri);
  try {
    const [total, missing, markedDemo, actual, needingUpdate] = await Promise.all([
      Exercise.countDocuments(),
      Exercise.countDocuments(missingVideoFilter),
      Exercise.countDocuments({ isDemoVideo: true }),
      Exercise.countDocuments({ $nor: [missingVideoFilter] }),
      Exercise.countDocuments(applyFilter),
    ]);
    console.log('Exercise Library summary', {
      total, missingVideos: missing, markedAsDemo: markedDemo,
      otherExistingLinks: actual, pendingBlankOrOldDemo: needingUpdate,
    });
    console.log('Requested sample URL:', DEMO_VIDEO_URL, '(testing only; not verified per-exercise)');
    if (!apply && !remove) {
      console.log('PREVIEW ONLY. To actually save links use: npm run demo:exercise-videos:apply');
      console.log('No exercise, patient, or programme records have been changed.');
      return;
    }
    if (apply) {
      const result = await Exercise.updateMany(applyFilter, {
        $set: { videoUrl: DEMO_VIDEO_URL, youtubeVideoId: DEMO_VIDEO_ID, isDemoVideo: true },
      });
      console.log('Requested demo links added/replaced:', result.modifiedCount,
        '| Existing video links overwritten: 0',
        '| Exercise activation changed: 0',
        '| Programmes approved/published: 0');
      return;
    }
    // Reversible: never delete a real video installed after the demo.
    const result = await Exercise.updateMany(demoOnlyFilter, {
      $set: { videoUrl: '', youtubeVideoId: '', isDemoVideo: false },
    });
    console.log('Demo links removed:', result.modifiedCount,
      '| Real videos untouched | Programme status unchanged');
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Exercise demo video update failed:', error.message);
  process.exitCode = 1;
});
