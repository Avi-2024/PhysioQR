require('dotenv').config();

const mongoose = require('mongoose');
const Program = require('../src/models/Program.model');
const PainCategory = require('../src/models/PainCategory.model');
const SurgeryType = require('../src/models/SurgeryType.model');

const BODY_REGIONS = [
  'Neck', 'Shoulder', 'Elbow', 'Wrist/Hand', 'Upper Back', 'Lower Back',
  'Spine', 'Hip', 'Thigh', 'Knee', 'Lower Leg', 'Ankle/Foot', 'Other',
];

const PROGRAM_VARIANTS = [
  { key: '14D', label: '14 Days', durationDays: 14 },
  { key: '30D', label: '30 Days', durationDays: 30 },
  { key: '45D', label: '45 Days', durationDays: 45 },
];

const regionProgramNames = {
  Neck: 'Neck Rehabilitation', Shoulder: 'Shoulder Rehabilitation', Elbow: 'Elbow Rehabilitation',
  'Wrist/Hand': 'Wrist & Hand Rehabilitation', 'Upper Back': 'Upper Back Rehabilitation',
  'Lower Back': 'Lower Back Rehabilitation', Spine: 'Spine Rehabilitation', Hip: 'Hip Rehabilitation',
  Thigh: 'Thigh Rehabilitation', Knee: 'Knee Rehabilitation', 'Lower Leg': 'Lower Leg Rehabilitation',
  'Ankle/Foot': 'Ankle & Foot Rehabilitation', Other: 'General Rehabilitation',
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const codePart = (value) => String(value).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);

async function resolveRegion(name) {
  const aliases = [name, `${name} Pain`];
  let region = await PainCategory.findOne({ name: { $in: aliases.map((value) => new RegExp(`^${escapeRegex(value)}$`, 'i')) } });
  if (!region) return PainCategory.create({ name, description: `${name} rehabilitation body region`, isActive: true });
  if (!region.isActive) { region.isActive = true; await region.save(); }
  return region;
}

async function ensureRegionProgramVariant(regionName, region, variant) {
  const baseCode = `AUTO-${codePart(regionName)}-REHAB`;
  const programCode = `${baseCode}-${variant.key}`;
  let program = await Program.findOne({ programCode });
  if (!program && variant.key === '30D') {
    program = await Program.findOne({ programCode: baseCode });
    if (program) program.programCode = programCode;
  }

  const name = `${regionProgramNames[regionName] || `${regionName} Rehabilitation`} · ${variant.label}`;
  if (!program) program = new Program({ programCode });
  program.name = name;
  program.painCategory = region._id;
  program.description = `${variant.label} rehabilitation programme shell mapped to the ${regionName} clinical pathway. Configure clinically reviewed exercises and videos in Admin before production use.`;
  program.objective = `Provide a ${variant.label.toLowerCase()} rehabilitation programme option for the ${regionName} pathway after clinical clearance.`;
  program.difficultyLevel = 'condition_specific';
  program.durationDays = variant.durationDays;
  program.sessionsPerDay = Number(program.sessionsPerDay || 1);
  program.eligibleConditions = Array.isArray(program.eligibleConditions) && program.eligibleConditions.length ? program.eligibleConditions : [regionName];
  program.isActive = true;
  const isNew = program.isNew;
  await program.save();
  return { action: isNew ? 'created' : 'updated', program };
}

async function ensurePostOpProgram(surgery) {
  const region = surgery.bodyRegion;
  if (!region?._id) return null;
  const programCode = `POSTOP-${codePart(surgery.code || surgery.name)}`;
  let program = await Program.findOne({ programCode });
  if (!program) program = new Program({ programCode });
  const isNew = program.isNew;
  program.name = `${surgery.name} Rehabilitation`;
  program.painCategory = region._id;
  program.description = `Post-surgery rehabilitation programme shell for ${surgery.name}. A clinician must select/approve this programme before patient payment. Configure exercises and progression before production use.`;
  program.objective = `Provide clinician-approved rehabilitation content after ${surgery.name}.`;
  program.difficultyLevel = 'post_operative';
  program.durationDays = Number(program.durationDays || 30);
  program.sessionsPerDay = Number(program.sessionsPerDay || 1);
  program.eligibleConditions = Array.isArray(program.eligibleConditions) && program.eligibleConditions.length ? program.eligibleConditions : [surgery.name];
  program.isActive = true;
  await program.save();
  return { action: isNew ? 'created' : 'updated', program };
}

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI or MONGO_URI is required');
  await mongoose.connect(uri);

  // Historical versions stored a programme-level defaultPrice. Programmes are now
  // clinical content only, so remove that field from every existing programme.
  const priceCleanup = await Program.collection.updateMany({}, { $unset: { defaultPrice: '' } });
  console.log(`[cleanup] removed legacy programme pricing from ${priceCleanup.modifiedCount || 0} programme(s)`);

  const summary = { created: 0, updated: 0, bodyRegions: 0, regionProgrammeOptions: 0, surgeryPrograms: 0 };
  for (const regionName of BODY_REGIONS) {
    const region = await resolveRegion(regionName);
    summary.bodyRegions += 1;
    for (const variant of PROGRAM_VARIANTS) {
      const result = await ensureRegionProgramVariant(regionName, region, variant);
      summary[result.action] += 1;
      summary.regionProgrammeOptions += 1;
      console.log(`[${result.action}] ${regionName} -> ${result.program.name}`);
    }
  }

  const surgeries = await SurgeryType.find({ isActive: true }).populate('bodyRegion', 'name isActive').sort({ displayOrder: 1, name: 1 });
  for (const surgery of surgeries) {
    if (!surgery.bodyRegion?.isActive) continue;
    const result = await ensurePostOpProgram(surgery);
    if (!result) continue;
    summary[result.action] += 1;
    summary.surgeryPrograms += 1;
    console.log(`[${result.action}] ${surgery.bodyRegion.name} / ${surgery.name} -> ${result.program.name}`);
  }

  console.log('\nRehabilitation programme seed complete.');
  console.log(summary);
  console.log(`Each body region has ${PROGRAM_VARIANTS.length} selectable programme options: ${PROGRAM_VARIANTS.map((item) => item.label).join(', ')}.`);
  console.log('Programmes have no fee. Patient fee is controlled only by Doctor or Admin.');
  console.log('Programme shells are active and mapped. Add clinically reviewed exercises/videos before production patient use.');
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
