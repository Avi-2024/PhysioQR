// One-time candidate assignment for GENERAL KNEE 30-DAY DRAFT only.
// Preview: npm run knee:video-candidates
// Apply:   npm run knee:video-candidates:apply
// Video candidates are flagged for clinical review, not shown to patients.
require('dotenv').config();
const mongoose = require('mongoose');
const { assignKneeVideoCandidates } = require('../src/services/kneeVideoCandidateMapping.service');

async function main() {
  const apply = process.argv.includes('--apply');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Draft candidate assignment is disabled in production');
  }
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not configured in backend/.env');
  await mongoose.connect(uri);
  try {
    const summary = await assignKneeVideoCandidates({ apply });
    console.log(apply ? 'APPLY RESULT (video review still pending)' : 'PREVIEW ONLY (no DB changes)');
    console.table(summary.items.map(({ exerciseName, status, videoUrl }) => ({ exerciseName, status, videoUrl })));
    console.log({
      candidates: summary.totalCandidates,
      updated: summary.changed,
      preservedExisting: summary.preserved,
      missingSeededExercises: summary.missing,
      patientProgrammePublished: summary.patientProgrammePublished,
    });
    if (!apply) console.log('To save candidate videos: npm run knee:video-candidates:apply');
  } finally {
    await mongoose.disconnect();
  }
}
main().catch((error) => {
  console.error('Knee video candidate assignment failed:', error.message);
  process.exitCode = 1;
});