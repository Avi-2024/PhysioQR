require('dotenv').config();

const mongoose = require('mongoose');
const Program = require('../src/models/Program.model');
const { ProgramDay } = require('../src/models/Exercise.model');

const AUTO_TARGET_REGEX = /^AUTO-.+-REHAB-(14D|30D|45D)$/i;
const FORCE = String(process.env.PROGRAM_CONTENT_FORCE || '').toLowerCase() === 'true';
const DRY_RUN = String(process.env.PROGRAM_CONTENT_DRY_RUN || '').toLowerCase() === 'true';

const looksLikePlaceholder = (value) => {
  const normalized = String(value || '').trim();
  return !normalized
    || /^YOUR[-_]/i.test(normalized)
    || /^REPLACE[-_]/i.test(normalized)
    || /^<.*>$/.test(normalized);
};

const RAW_SOURCE_CODE = String(process.env.PROGRAM_CONTENT_SOURCE_CODE || '').trim();
const EXPLICIT_SOURCE_CODE = looksLikePlaceholder(RAW_SOURCE_CODE) ? '' : RAW_SOURCE_CODE;
const EXPLICIT_TARGET_CODES = String(process.env.PROGRAM_CONTENT_TARGET_CODES || '')
  .split(',')
  .map((value) => value.trim())
  .filter((value) => value && !looksLikePlaceholder(value));

const id = (value) => String(value?._id || value || '');
const sameId = (a, b) => Boolean(id(a)) && id(a) === id(b);

function hasVideo(exercise) {
  return Boolean(String(exercise?.videoUrl || '').trim() || String(exercise?.youtubeVideoId || '').trim());
}

function validEntries(day) {
  return (day?.exercises || [])
    .filter((entry) => entry?.exercise && entry.exercise.isActive !== false)
    .map((entry, index) => ({
      exercise: entry.exercise._id,
      displayOrder: Number.isFinite(Number(entry.displayOrder))
        ? Number(entry.displayOrder)
        : index + 1,
    }));
}

async function buildContentProfiles(programs) {
  const programIds = programs.map((program) => program._id);
  const days = await ProgramDay.find({
    program: { $in: programIds },
    isActive: true,
    'exercises.0': { $exists: true },
  })
    .populate('exercises.exercise', '_id name isActive videoUrl youtubeVideoId thumbnail')
    .sort({ dayNumber: 1, createdAt: 1 })
    .lean();

  const grouped = new Map();
  for (const day of days) {
    const key = id(day.program);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(day);
  }

  const profiles = new Map();
  for (const program of programs) {
    const sourceDays = grouped.get(id(program)) || [];
    let exerciseAssignments = 0;
    let videoAssignments = 0;
    let usableDays = 0;

    for (const day of sourceDays) {
      const entries = (day.exercises || []).filter(
        (entry) => entry?.exercise && entry.exercise.isActive !== false,
      );
      if (!entries.length) continue;
      usableDays += 1;
      exerciseAssignments += entries.length;
      videoAssignments += entries.filter((entry) => hasVideo(entry.exercise)).length;
    }

    profiles.set(id(program), {
      program,
      days: sourceDays,
      usableDays,
      exerciseAssignments,
      videoAssignments,
    });
  }
  return profiles;
}

function sourceScore(profile, target) {
  const source = profile.program;
  const exactDuration = Number(source.durationDays || 0) === Number(target.durationDays || 0) ? 1 : 0;
  const nonAuto = AUTO_TARGET_REGEX.test(String(source.programCode || '')) ? 0 : 1;
  return [
    exactDuration,
    profile.videoAssignments,
    profile.exerciseAssignments,
    profile.usableDays,
    nonAuto,
    Number(source.updatedAt ? new Date(source.updatedAt).getTime() : 0),
  ];
}

function compareScore(a, b) {
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return b[index] - a[index];
  }
  return 0;
}

function pickAutomaticSource(target, profiles) {
  const candidates = [...profiles.values()].filter((profile) => {
    const source = profile.program;
    if (sameId(source, target)) return false;
    if (!sameId(source.painCategory, target.painCategory)) return false;
    if (!profile.usableDays || !profile.exerciseAssignments) return false;
    if (/^POSTOP-/i.test(String(source.programCode || ''))) return false;
    return true;
  });

  candidates.sort((a, b) => compareScore(sourceScore(a, target), sourceScore(b, target)));
  return candidates[0] || null;
}

async function resolveTargets(programs) {
  if (EXPLICIT_TARGET_CODES.length) {
    const targets = programs.filter((program) => EXPLICIT_TARGET_CODES.includes(String(program.programCode || '')));
    const missing = EXPLICIT_TARGET_CODES.filter(
      (code) => !targets.some((program) => String(program.programCode || '') === code),
    );
    if (missing.length) {
      throw new Error(`Target programme code(s) not found: ${missing.join(', ')}`);
    }
    return targets;
  }

  if (EXPLICIT_SOURCE_CODE) {
    const source = programs.find((program) => String(program.programCode || '') === EXPLICIT_SOURCE_CODE);
    if (!source) throw new Error(`Source programme not found: ${EXPLICIT_SOURCE_CODE}`);
    return programs.filter(
      (program) => AUTO_TARGET_REGEX.test(String(program.programCode || ''))
        && sameId(program.painCategory, source.painCategory)
        && !sameId(program, source),
    );
  }

  return programs.filter((program) => AUTO_TARGET_REGEX.test(String(program.programCode || '')));
}

async function copySourceToTarget({ sourceProfile, target, summary }) {
  const source = sourceProfile.program;
  const targetDuration = Math.max(1, Number(target.durationDays || 1));
  const sourceDays = sourceProfile.days
    .filter((day) => Number(day.dayNumber || 0) >= 1 && Number(day.dayNumber) <= targetDuration)
    .sort((a, b) => Number(a.dayNumber || 0) - Number(b.dayNumber || 0));

  if (!sourceDays.length) {
    console.log(`[skip] ${target.programCode}: source ${source.programCode} has no usable days within target duration`);
    summary.skippedTargets += 1;
    return;
  }

  console.log(
    `\n[target] ${target.programCode} (${target.name}) <- ${source.programCode} (${source.name})`,
  );
  console.log(
    `         source content: ${sourceProfile.usableDays} day(s), ${sourceProfile.exerciseAssignments} exercise assignment(s), ${sourceProfile.videoAssignments} video assignment(s)`,
  );

  let targetChanged = false;

  for (const sourceDay of sourceDays) {
    const dayNumber = Number(sourceDay.dayNumber);
    const entries = validEntries(sourceDay);
    if (!entries.length) continue;

    const existingDays = await ProgramDay.find({
      program: target._id,
      dayNumber,
    }).sort({ createdAt: 1 });

    if (existingDays.length > 1) {
      console.warn(
        `[warning] ${target.programCode} Day ${dayNumber} has ${existingDays.length} ProgramDay records; using the oldest record and leaving duplicates untouched.`,
      );
    }

    const existing = existingDays[0] || null;
    const hasExistingContent = Boolean(existing?.exercises?.length);

    if (hasExistingContent && !FORCE) {
      console.log(`  [keep] Day ${dayNumber}: target already has ${existing.exercises.length} exercise(s)`);
      summary.keptDays += 1;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [dry-run] Day ${dayNumber}: would ${existing ? 'update' : 'create'} with ${entries.length} exercise(s)`);
      summary.migratedDays += 1;
      targetChanged = true;
      continue;
    }

    if (existing) {
      existing.title = sourceDay.title || existing.title || `Day ${dayNumber}`;
      existing.exercises = entries;
      existing.isActive = true;
      await existing.save();
      console.log(`  [updated] Day ${dayNumber}: ${entries.length} exercise(s)`);
    } else {
      await ProgramDay.create({
        program: target._id,
        dayNumber,
        title: sourceDay.title || `Day ${dayNumber}`,
        exercises: entries,
        isActive: true,
      });
      console.log(`  [created] Day ${dayNumber}: ${entries.length} exercise(s)`);
    }

    summary.migratedDays += 1;
    targetChanged = true;
  }

  if (targetChanged) summary.migratedTargets += 1;
  else summary.skippedTargets += 1;

  const sourceMaxDay = sourceDays.reduce((max, day) => Math.max(max, Number(day.dayNumber || 0)), 0);
  if (sourceMaxDay < targetDuration) {
    console.log(
      `  [note] Source only provides content through Day ${sourceMaxDay}; Days ${sourceMaxDay + 1}-${targetDuration} were NOT auto-repeated.`,
    );
  }
}

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI or MONGO_URI is required');

  await mongoose.connect(uri);

  const programs = await Program.find({ isActive: true })
    .select('_id programCode name painCategory durationDays isActive updatedAt')
    .sort({ programCode: 1 })
    .lean();

  if (!programs.length) throw new Error('No active programmes found');

  // Snapshot source content before any writes so newly migrated targets do not
  // become accidental sources later in the same run.
  const profiles = await buildContentProfiles(programs);
  const targets = await resolveTargets(programs);

  if (!targets.length) {
    throw new Error('No target AUTO rehabilitation programmes found for migration');
  }

  let explicitSourceProfile = null;
  if (EXPLICIT_SOURCE_CODE) {
    const explicitSource = programs.find(
      (program) => String(program.programCode || '') === EXPLICIT_SOURCE_CODE,
    );
    if (!explicitSource) throw new Error(`Source programme not found: ${EXPLICIT_SOURCE_CODE}`);
    explicitSourceProfile = profiles.get(id(explicitSource));
    if (!explicitSourceProfile?.exerciseAssignments) {
      throw new Error(`Source programme ${EXPLICIT_SOURCE_CODE} has no configured exercise mappings`);
    }
  }

  if (RAW_SOURCE_CODE && !EXPLICIT_SOURCE_CODE) {
    console.warn(`[config] Ignoring placeholder PROGRAM_CONTENT_SOURCE_CODE="${RAW_SOURCE_CODE}" and using automatic same-region source discovery.`);
  }

  console.log('Programme content migration');
  console.log(`Mode: ${EXPLICIT_SOURCE_CODE ? 'explicit source' : 'automatic same-region source'}`);
  console.log(`Force overwrite existing target days: ${FORCE ? 'YES' : 'NO'}`);
  console.log(`Dry run: ${DRY_RUN ? 'YES' : 'NO'}`);
  console.log(`Targets: ${targets.length}`);

  const summary = {
    targets: targets.length,
    migratedTargets: 0,
    skippedTargets: 0,
    migratedDays: 0,
    keptDays: 0,
    noSource: 0,
  };

  for (const target of targets) {
    let sourceProfile = explicitSourceProfile;

    if (sourceProfile && !sameId(sourceProfile.program.painCategory, target.painCategory)) {
      console.log(
        `[skip] ${target.programCode}: explicit source ${sourceProfile.program.programCode} belongs to a different body region`,
      );
      summary.noSource += 1;
      continue;
    }

    if (!sourceProfile) sourceProfile = pickAutomaticSource(target, profiles);

    if (!sourceProfile) {
      console.log(
        `[no-source] ${target.programCode}: no existing configured programme found for the same body region. Nothing invented.`,
      );
      summary.noSource += 1;
      continue;
    }

    await copySourceToTarget({ sourceProfile, target, summary });
  }

  console.log('\nMigration complete.');
  console.log(summary);
  console.log('Existing Exercise documents are reused, so videoUrl/youtubeVideoId/thumbnail stay intact.');
  console.log('No programme fee or payment data is changed.');
  console.log('No missing clinical days are auto-repeated or invented.');

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
