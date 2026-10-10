// DEV/TEST ONLY: fill missing exercise videos with the OFFICIAL YouTube IFrame
// API sample video. It is NOT an exercise tutorial. No programmes are approved
// or activated. Patient endpoints redact these links; release gate rejects them.
// Usage: npm run demo:exercise-videos            (read-only preview)
//        npm run demo:exercise-videos -- --apply (insert for missing only)
//        npm run demo:exercise-videos -- --remove (remove our test-only URLs)
require('dotenv').config();
const mongoose = require('mongoose');
const { Exercise } = require('../src/models/Exercise.model');
const { DEMO_VIDEO_ID, DEMO_VIDEO_URL } = require('../src/services/demoExerciseVideo.service');

const blankField = (name) => ({ $or: [
  { [name]: { $exists: false } }, { [name]: null }, { [name]: '' },
] });
const missingVideoFilter = { $and: [
  blankField('videoUrl'),
  blankField('youtubeVideoId'),
] };
const demoOnlyFilter = {
  isDemoVideo: true,
  videoUrl: DEMO_VIDEO_URL,
  youtubeVideoId: DEMO_VIDEO_ID,
};

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
    const [total, missing, markedDemo, actual] = await Promise.all([
      Exercise.countDocuments(),
      Exercise.countDocuments(missingVideoFilter),
      Exercise.countDocuments({ isDemoVideo: true }),
      Exercise.countDocuments({ $nor: [missingVideoFilter] }),
    ]);
    console.log('Exercise Library summary', {
      total, missingVideos: missing, markedAsDemo: markedDemo, existingLinksPreserved: actual,
    });
    console.log('Sample URL:', DEMO_VIDEO_URL, '(testing only; NOT rehabilitation guidance)');
    if (!apply && !remove) {
      console.log('PREVIEW ONLY. To fill every exercise with missing video fields, use --apply.');
      console.log('No exercise, patient, or programme records have been changed.');
      return;
    }
    if (apply) {
      const result = await Exercise.updateMany(missingVideoFilter, {
        $set: { videoUrl: DEMO_VIDEO_URL, youtubeVideoId: DEMO_VIDEO_ID, isDemoVideo: true },
      });
      console.log('Demo links added:', result.modifiedCount,
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
