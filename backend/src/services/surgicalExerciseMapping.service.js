const mongoose = require('mongoose');
const SurgeryType = require('../models/SurgeryType.model');
const Program = require('../models/Program.model');
const { ProgramDay } = require('../models/Exercise.model');

// This is the SAME deterministic identity used by seedRehabPrograms.js.
// A programme shell alone is not evidence of clinically reviewed exercises.
const surgeryProgrammeCode = (code) =>
  `POSTOP-${String(code).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)}`;

const lookupSurgery = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error('Invalid post-surgical condition');
    error.status = 400;
    throw error;
  }
  const surgery = await SurgeryType.findOne({ _id: id, isActive: true })
    .select('_id code name bodyRegion isActive').lean();
  if (!surgery) {
    const error = new Error('Post-surgical condition was not found or is inactive');
    error.status = 404;
    throw error;
  }
  return surgery;
};

// Only explicit surgery mappings and exercises scheduled in that surgery's
// post-op programme are returned. General body-region exercises are NOT
// automatically assumed suitable following surgery.
const exerciseIdsForSurgeryProgramme = async (surgery) => {
  const programmes = await Program.find({
    isActive: true,
    difficultyLevel: 'post_operative',
    painCategory: surgery.bodyRegion,
    $or: [
      { programCode: surgeryProgrammeCode(surgery.code) },
      { eligibleConditions: surgery.code },
      { eligibleConditions: surgery.name },
    ],
  }).select('_id').lean();
  if (!programmes.length) return [];
  return ProgramDay.distinct('exercises.exercise', {
    program: { $in: programmes.map((programme) => programme._id) },
    isActive: true,
  });
};

const surgeryFilter = (surgeryId, programExerciseIds = [], bodyRegionId) => ({
  $or: [
    // Explicit tags must still match this condition's body region.
    { surgeryTypes: surgeryId, ...(bodyRegionId ? { painCategory: bodyRegionId } : {}) },
    // Clinically scheduled programme exercises may be cross-category/general.
    ...(programExerciseIds.length ? [{ _id: { $in: programExerciseIds } }] : []),
  ],
});

module.exports = { lookupSurgery, surgeryProgrammeCode, exerciseIdsForSurgeryProgramme, surgeryFilter };
