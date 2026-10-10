// Idempotent, non-destructive seed for one INACTIVE 30-day general knee draft.
// Does not touch the existing AUTO-KNEE-* programmes, old patient records,
// payment, surgery programmes, or any videos. Re-runs never overwrite Admin edits.
require('dotenv').config();

const mongoose = require('mongoose');
const Program = require('../src/models/Program.model');
const PainCategory = require('../src/models/PainCategory.model');
const { Exercise, ProgramDay } = require('../src/models/Exercise.model');
const {
  PROGRAM_CODE, EXERCISE_PREFIX, commonSafety, exercises, days, validateDraft,
} = require('../src/data/generalKnee30DayDraft');

const resolveKneeRegion = async () => {
  const matches = await PainCategory.find({
    name: { $in: [/^knee$/i, /^knee pain$/i, /^knee joint$/i] },
    isActive: true,
  }).sort({ name: 1 });
  if (!matches.length) throw new Error('Active Knee body region not found. Configure Knee in Admin first.');
  const exact = matches.find((item) => item.name.trim().toLowerCase() === 'knee');
  return exact || matches[0];
};

async function run() {
  const errors = validateDraft();
  if (errors.length) throw new Error(`Draft data invalid: ${errors.join('; ')}`);
  if (process.argv.includes('--validate')) {
    console.log(`Validated: ${days.length} day definitions, ${exercises.length} exercise definitions, ${days.reduce((n,d)=>n+d.items.length,0)} day-exercise mappings.`);
    return;
  }
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI required (the backend uses MONGO_URI).');
  if (process.env.MONGODB_URI && process.env.MONGODB_URI !== uri) {
    console.warn('MONGODB_URI differs from MONGO_URI; using MONGO_URI (backend database).');
  }
  await mongoose.connect(uri);
  try {
    const region = await resolveKneeRegion();
    let program = await Program.findOne({ programCode: PROGRAM_CODE });
    if (program?.isActive) throw new Error(`${PROGRAM_CODE} already active. Refusing to modify a live programme.`);
    if (program && String(program.painCategory) !== String(region._id)) {
      throw new Error('Draft programme code already belongs to a different body region.');
    }
    if (!program) {
      program = await Program.create({
        programCode: PROGRAM_CODE,
        name: 'General Knee Pain | 30-Day Physiotherapy (CLINICAL DRAFT)',
        description: 'Non-operative, non-acute general knee discomfort. Thirty-day exercise-content draft for clinician review. No diagnosis, no video links and no patient release approval yet.',
        objective: 'Draft symptom-guided knee mobility, quadriceps/hip strength, balance and functional-control progression for clinician adaptation.',
        instructions: 'CLINICIAN REVIEW REQUIRED. Individualize exercise selection, load, pain limits and progression after assessment. Days are proposals, not fixed medical milestones. Warm up gently for 5–10 minutes only as tolerated and approved. Allow recovery between harder sessions.',
        precautions: `${commonSafety} NOT for knee replacement, recent surgery, acute trauma, suspected infection, inability to weight-bear, marked hot swollen knee or severe instability. Seek timely evaluation for red flags.`,
        painCategory: region._id,
        difficultyLevel: 'beginner',
        durationDays: 30,
        sessionsPerDay: 1,
        eligibleConditions: ['General non-operative knee discomfort only, after clinical assessment'],
        excludedConditions: ['Post-operative knee rehabilitation', 'Recent trauma or fracture', 'Unassessed severe swelling or instability', 'Suspected infection', 'Red flags or clinician-imposed restrictions'],
        requiredEquipment: ['Stable chair', 'Stable counter or rail', 'Mat or firm bed', 'Low step only after clinical clearance'],
        clinicalApprovalRequired: true,
        isActive: false,
      });
      console.log(`[created] Inactive programme: ${program.name}`);
    } else {
      if (!program.clinicalApprovalRequired) {
        throw new Error('Existing draft programme lacks clinical approval gate; refusing to edit it. Review with Admin first.');
      }
      console.log('[preserved] Existing draft programme and any Admin edits.');
    }

    const exerciseIds = new Map();
    for (let i = 0; i < exercises.length; i += 1) {
      const definition = exercises[i];
      const seedKey = EXERCISE_PREFIX + definition.key;
      let exercise = await Exercise.findOne({ seedKey });
      if (exercise && String(exercise.painCategory) !== String(region._id)) {
        throw new Error(`Seeded exercise ${seedKey} belongs to a different body region`);
      }
      if (!exercise) {
        exercise = await Exercise.create({
          seedKey,
          name: definition.name,
          description: definition.description,
          painCategory: region._id,
          sets: definition.sets,
          repetitions: definition.repetitions,
          holdDuration: definition.holdDuration,
          restDuration: definition.restDuration,
          requiredEquipment: definition.equipment,
          safetyInstructions: `${definition.safety} ${commonSafety}`,
          commonMistakes: 'Moving too fast, forcing range, holding breath or exercising through worsening pain.',
          frequency: 'As assigned in the reviewed day-wise programme (not an independent prescription).',
          language: 'en',
          displayOrder: (i + 1) * 10,
          videoUrl: '',
          youtubeVideoId: '',
          isActive: false,
        });
      }
      exerciseIds.set(definition.key, exercise._id);
    }
    console.log(`[ready] ${exerciseIds.size} draft exercise records (no video links created)`);

    let createdDays = 0;
    for (const definition of days) {
      const existing = await ProgramDay.findOne({ program: program._id, dayNumber: definition.dayNumber });
      if (existing) continue; // Never silently overwrite a clinician's changes.
      await ProgramDay.create({
        program: program._id,
        dayNumber: definition.dayNumber,
        title: definition.title,
        focus: definition.focus,
        isActive: true, // Safe because the parent programme remains inactive.
        exercises: definition.items.map((item,index)=>({
          exercise: exerciseIds.get(item.key),
          displayOrder: index + 1,
          sets: item.sets,
          repetitions: item.repetitions,
          holdDuration: item.holdDuration,
          restDuration: exercises.find((exercise)=>exercise.key===item.key).restDuration,
        })),
      });
      createdDays += 1;
    }
    const finalDays = await ProgramDay.countDocuments({ program: program._id, isActive: true });
    console.log(`[done] ${createdDays} new days; ${finalDays} active day records linked to inactive draft.`);
    console.log('Patient-visible: NO. Clinical approval: NOT RECORDED. Videos: NOT ADDED.');
    console.log('Admin > Programmes > search DRAFT-KNEE-GENERAL-30D to review each day.');
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Knee draft seed failed:', error.message);
  process.exitCode = 1;
});
