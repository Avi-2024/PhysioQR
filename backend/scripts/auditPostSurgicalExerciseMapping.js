require('dotenv').config();
const mongoose = require('mongoose');
const SurgeryType = require('../src/models/SurgeryType.model');
const PainCategory = require('../src/models/PainCategory.model');
const { Exercise } = require('../src/models/Exercise.model');
const { exerciseIdsForSurgeryProgramme, surgeryFilter } = require('../src/services/surgicalExerciseMapping.service');

// Read-only audit: never publish exercises, change surgery mappings or modify
// patient clinical programmes without a clinician's explicit review.
async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI or MONGODB_URI is required');
  await mongoose.connect(uri);
  try {
    const surgeries = await SurgeryType.find({ isActive: true })
      .populate('bodyRegion', 'name isActive')
      .sort({ displayOrder: 1, name: 1 }).lean();
    const rows = [];
    for (const surgery of surgeries) {
      if (!surgery.bodyRegion?.isActive) continue;
      const compatibleSurgery = { ...surgery, bodyRegion: surgery.bodyRegion._id };
      const existingProgrammeIds = await exerciseIdsForSurgeryProgramme(compatibleSurgery);
      const mappedQuery = { isActive: true, painCategory: surgery.bodyRegion._id,
        ...surgeryFilter(surgery._id, existingProgrammeIds) };
      const [mappedCount, taggedCount, inProgrammeCount] = await Promise.all([
        Exercise.countDocuments(mappedQuery),
        Exercise.countDocuments({ isActive: true, painCategory: surgery.bodyRegion._id, surgeryTypes: surgery._id }),
        Exercise.countDocuments({ isActive: true, painCategory: surgery.bodyRegion._id,
          _id: { $in: existingProgrammeIds } }),
      ]);
      rows.push({
        region: surgery.bodyRegion.name, surgery: surgery.name, surgeryCode: surgery.code,
        matchedActive: mappedCount, explicitlyTagged: taggedCount,
        inPostopProgramme: inProgrammeCount,
        needsContentMapping: mappedCount === 0,
      });
    }
    console.table(rows);
    const missing = rows.filter((row) => row.needsContentMapping);
    console.log(`Supported active surgery types: ${rows.length}; mapped active exercises present: ${rows.length - missing.length}; need clinical content mapping: ${missing.length}`);
    if (missing.length) console.log('Unmapped conditions:', missing.map((item) => item.surgeryCode).join(', '));
    console.log('This report checks mapping/counts, NOT clinical suitability, video approval, post-op timing or programme publication. Clinical release gates remain authoritative.');
    if (process.argv.includes('--fail-if-unmapped') && missing.length) process.exitCode = 2;
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(async (error) => {
  console.error(error.message);
  process.exitCode = 1;
  await mongoose.disconnect().catch(() => {});
});
