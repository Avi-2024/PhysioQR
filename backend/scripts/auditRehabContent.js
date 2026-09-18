require('dotenv').config();

const mongoose = require('mongoose');
const PainCategory = require('../src/models/PainCategory.model');
const Program = require('../src/models/Program.model');
const { Exercise, ProgramDay } = require('../src/models/Exercise.model');

const AUTO_PROGRAM_REGEX = /^AUTO-.+-REHAB-(14D|30D|45D)$/i;

const id = (value) => String(value?._id || value || '');
const text = (value) => String(value ?? '').trim();
const hasVideo = (exercise) => Boolean(text(exercise?.videoUrl) || text(exercise?.youtubeVideoId));

function categoryLabel(category) {
  return category?.name || 'Uncategorised';
}

function shortId(value) {
  const valueText = id(value);
  return valueText ? valueText.slice(-8) : '-';
}

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI or MONGO_URI is required');

  await mongoose.connect(uri);

  const [categories, exercises, programs, programDays] = await Promise.all([
    PainCategory.find({}).sort({ name: 1 }).lean(),
    Exercise.find({})
      .populate('painCategory', 'name isActive')
      .sort({ isActive: -1, displayOrder: 1, name: 1 })
      .lean(),
    Program.find({})
      .populate('painCategory', 'name isActive')
      .sort({ isActive: -1, programCode: 1 })
      .lean(),
    ProgramDay.find({})
      .populate('program', 'programCode name painCategory isActive durationDays')
      .populate('exercises.exercise', 'name painCategory isActive videoUrl youtubeVideoId thumbnail language')
      .sort({ dayNumber: 1, createdAt: 1 })
      .lean(),
  ]);

  const usage = new Map();
  const activeUsage = new Map();

  for (const day of programDays) {
    for (const entry of day.exercises || []) {
      const exerciseId = id(entry.exercise);
      if (!exerciseId) continue;

      if (!usage.has(exerciseId)) usage.set(exerciseId, []);
      usage.get(exerciseId).push(day);

      if (day.isActive !== false && day.program?.isActive !== false) {
        if (!activeUsage.has(exerciseId)) activeUsage.set(exerciseId, []);
        activeUsage.get(exerciseId).push(day);
      }
    }
  }

  const categoryIds = new Set(categories.map((item) => id(item)));
  const unknownCategoryIds = new Set([
    ...exercises.map((item) => id(item.painCategory)).filter(Boolean),
    ...programs.map((item) => id(item.painCategory)).filter(Boolean),
  ].filter((value) => !categoryIds.has(value)));

  const categoryRows = [
    ...categories.map((category) => ({ id: id(category), name: categoryLabel(category), active: category.isActive !== false })),
    ...[...unknownCategoryIds].map((categoryId) => ({ id: categoryId, name: `Unknown category ${shortId(categoryId)}`, active: false })),
    { id: '', name: 'Uncategorised', active: true },
  ];

  const totals = {
    categories: categories.length,
    exercises: exercises.length,
    activeExercises: exercises.filter((item) => item.isActive !== false).length,
    exercisesWithVideo: exercises.filter((item) => hasVideo(item)).length,
    programmes: programs.length,
    activeProgrammes: programs.filter((item) => item.isActive !== false).length,
    autoProgrammes: programs.filter((item) => AUTO_PROGRAM_REGEX.test(text(item.programCode))).length,
    programDays: programDays.length,
    activeProgramDays: programDays.filter((item) => item.isActive !== false && item.program?.isActive !== false).length,
  };

  console.log('\n=== PhysioQR Rehab Content Audit ===');
  console.log(`Categories: ${totals.categories}`);
  console.log(`Exercises: ${totals.exercises} total / ${totals.activeExercises} active / ${totals.exercisesWithVideo} with video`);
  console.log(`Programmes: ${totals.programmes} total / ${totals.activeProgrammes} active / ${totals.autoProgrammes} AUTO rehab`);
  console.log(`ProgramDays: ${totals.programDays} total / ${totals.activeProgramDays} active\n`);

  const summaryRows = [];

  for (const category of categoryRows) {
    const categoryExercises = exercises.filter((exercise) => id(exercise.painCategory) === category.id);
    const activeCategoryExercises = categoryExercises.filter((exercise) => exercise.isActive !== false);
    const videoExercises = activeCategoryExercises.filter(hasVideo);
    const mappedExercises = activeCategoryExercises.filter((exercise) => (activeUsage.get(id(exercise)) || []).length > 0);
    const unassignedVideos = videoExercises.filter((exercise) => (activeUsage.get(id(exercise)) || []).length === 0);

    const categoryPrograms = programs.filter((program) => id(program.painCategory) === category.id);
    const activeCategoryPrograms = categoryPrograms.filter((program) => program.isActive !== false);
    const autoPrograms = activeCategoryPrograms.filter((program) => AUTO_PROGRAM_REGEX.test(text(program.programCode)));

    const categoryProgramIds = new Set(activeCategoryPrograms.map((program) => id(program)));
    const activeDays = programDays.filter(
      (day) => day.isActive !== false && categoryProgramIds.has(id(day.program)),
    );
    const contentDays = activeDays.filter((day) =>
      (day.exercises || []).some((entry) => entry.exercise && entry.exercise.isActive !== false),
    );

    const programsWithDay1 = new Set(
      activeDays.filter((day) => Number(day.dayNumber) === 1).map((day) => id(day.program)),
    );
    const autoMissingDay1 = autoPrograms.filter((program) => !programsWithDay1.has(id(program)));

    if (
      !categoryExercises.length
      && !categoryPrograms.length
      && !activeDays.length
      && category.name === 'Uncategorised'
    ) continue;

    summaryRows.push({
      region: category.name,
      exercises: activeCategoryExercises.length,
      videos: videoExercises.length,
      mapped: mappedExercises.length,
      unassignedVideos: unassignedVideos.length,
      programmes: activeCategoryPrograms.length,
      contentDays: contentDays.length,
      autoMissingDay1: autoMissingDay1.length,
    });

    console.log(`--- ${category.name} ---`);
    console.log(
      `Exercises: ${activeCategoryExercises.length} active | ${videoExercises.length} with video | ${mappedExercises.length} used in active ProgramDay | ${unassignedVideos.length} unassigned video(s)`,
    );
    console.log(
      `Programmes: ${activeCategoryPrograms.length} active | ${autoPrograms.length} AUTO | ${contentDays.length} active day(s) with exercise content | ${autoMissingDay1.length} AUTO programme(s) missing Day 1`,
    );

    if (videoExercises.length) {
      console.log('Video exercises:');
      for (const exercise of videoExercises) {
        const days = activeUsage.get(id(exercise)) || [];
        const mappedTo = days.map((day) => {
          const programCode = text(day.program?.programCode) || shortId(day.program);
          return `${programCode}:Day${day.dayNumber}`;
        });
        console.log(
          `  - ${exercise.name} [${shortId(exercise)}] | ${mappedTo.length ? `mapped: ${mappedTo.join(', ')}` : 'UNASSIGNED'} | ${text(exercise.videoUrl) || text(exercise.youtubeVideoId)}`,
        );
      }
    }

    if (autoMissingDay1.length) {
      console.log('AUTO programmes missing Day 1:');
      for (const program of autoMissingDay1) {
        console.log(`  - ${program.programCode} [${shortId(program)}] ${program.name}`);
      }
    }

    if (!videoExercises.length && activeCategoryExercises.length) {
      console.log('Active exercises without video:');
      for (const exercise of activeCategoryExercises.slice(0, 20)) {
        console.log(`  - ${exercise.name} [${shortId(exercise)}]`);
      }
      if (activeCategoryExercises.length > 20) {
        console.log(`  ... plus ${activeCategoryExercises.length - 20} more`);
      }
    }

    console.log('');
  }

  const crossCategoryMappings = [];
  const missingExerciseRefs = [];

  for (const day of programDays) {
    const programCategoryId = id(day.program?.painCategory);
    for (const entry of day.exercises || []) {
      if (!entry.exercise) {
        missingExerciseRefs.push({
          programCode: text(day.program?.programCode) || shortId(day.program),
          dayNumber: day.dayNumber,
        });
        continue;
      }
      const exerciseCategoryId = id(entry.exercise.painCategory);
      if (programCategoryId && exerciseCategoryId && programCategoryId !== exerciseCategoryId) {
        crossCategoryMappings.push({
          programCode: text(day.program?.programCode) || shortId(day.program),
          dayNumber: day.dayNumber,
          exercise: entry.exercise.name,
          exerciseId: id(entry.exercise),
          programCategoryId,
          exerciseCategoryId,
        });
      }
    }
  }

  const orphanVideoExercises = exercises.filter(
    (exercise) => exercise.isActive !== false
      && hasVideo(exercise)
      && (activeUsage.get(id(exercise)) || []).length === 0,
  );

  console.log('=== Summary by Region ===');
  console.table(summaryRows);

  console.log('\n=== Global Findings ===');
  console.log(`Active video exercises not used in any active ProgramDay: ${orphanVideoExercises.length}`);
  console.log(`Cross-category ProgramDay mappings: ${crossCategoryMappings.length}`);
  console.log(`ProgramDay entries with missing/deleted Exercise reference: ${missingExerciseRefs.length}`);

  if (orphanVideoExercises.length) {
    console.log('\nUnassigned active video exercises:');
    for (const exercise of orphanVideoExercises) {
      console.log(
        `  - ${categoryLabel(exercise.painCategory)} | ${exercise.name} | exerciseId=${id(exercise)} | video=${text(exercise.videoUrl) || text(exercise.youtubeVideoId)}`,
      );
    }
  }

  if (crossCategoryMappings.length) {
    console.log('\nCross-category mappings (review before production):');
    for (const item of crossCategoryMappings) {
      console.log(
        `  - ${item.programCode}:Day${item.dayNumber} -> ${item.exercise} [${shortId(item.exerciseId)}]`,
      );
    }
  }

  if (missingExerciseRefs.length) {
    console.log('\nBroken ProgramDay exercise references:');
    for (const item of missingExerciseRefs) {
      console.log(`  - ${item.programCode}:Day${item.dayNumber}`);
    }
  }

  console.log('\nAudit only: no database records were changed.');
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
