require('dotenv').config();

const mongoose = require('mongoose');
const Program = require('../src/models/Program.model');
const PainCategory = require('../src/models/PainCategory.model');
const SurgeryType = require('../src/models/SurgeryType.model');

const DEFAULT_PRICE = Number(process.env.SEED_REHAB_PROGRAM_PRICE || 999);
const DEFAULT_DURATION_DAYS = Number(process.env.SEED_REHAB_PROGRAM_DURATION_DAYS || 30);

const BODY_REGIONS = [
  'Neck', 'Shoulder', 'Elbow', 'Wrist/Hand', 'Upper Back', 'Lower Back',
  'Spine', 'Hip', 'Thigh', 'Knee', 'Lower Leg', 'Ankle/Foot', 'Other',
];

const regionProgramNames = {
  Neck: 'Neck Rehabilitation',
  Shoulder: 'Shoulder Rehabilitation',
  Elbow: 'Elbow Rehabilitation',
  'Wrist/Hand': 'Wrist & Hand Rehabilitation',
  'Upper Back': 'Upper Back Rehabilitation',
  'Lower Back': 'Lower Back Rehabilitation',
  Spine: 'Spine Rehabilitation',
  Hip: 'Hip Rehabilitation',
  Thigh: 'Thigh Rehabilitation',
  Knee: 'Knee Rehabilitation',
  'Lower Leg': 'Lower Leg Rehabilitation',
  'Ankle/Foot': 'Ankle & Foot Rehabilitation',
  Other: 'General Rehabilitation',
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const codePart = (value) => String(value)
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 50);

async function resolveRegion(name) {
  const aliases = [name, `${name} Pain`];
  let region = await PainCategory.findOne({
    name: { $in: aliases.map((value) => new RegExp(`^${escapeRegex(value)}$`, 'i')) },
  });

  if (!region) {
    region = await PainCategory.create({
      name,
      description: `${name} rehabilitation body region`,
      isActive: true,
    });
    return region;
  }

  if (!region.isActive) {
    region.isActive = true;
    await region.save();
  }
  return region;
}

async function ensureBaseProgram(regionName, region) {
  const existingCoverage = await Program.findOne({
    painCategory: region._id,
    isActive: true,
    difficultyLevel: { $ne: 'post_operative' },
  }).sort({ createdAt: 1 });

  if (existingCoverage) {
    let changed = false;
    if (!Number(existingCoverage.defaultPrice)) {
      existingCoverage.defaultPrice = DEFAULT_PRICE;
      changed = true;
    }
    if (changed) await existingCoverage.save();
    return { action: changed ? 'updated' : 'covered', program: existingCoverage };
  }

  const programCode = `AUTO-${codePart(regionName)}-REHAB`;
  const program = await Program.findOneAndUpdate(
    { programCode },
    {
      $set: {
        painCategory: region._id,
        isActive: true,
      },
      $setOnInsert: {
        name: regionProgramNames[regionName] || `${regionName} Rehabilitation`,
        description: `Rehabilitation programme shell mapped to the ${regionName} clinical pathway. Configure exercises and videos in Admin before production use.`,
        objective: `Provide structured rehabilitation content for the ${regionName} pathway after clinical clearance.`,
        difficultyLevel: 'condition_specific',
        durationDays: DEFAULT_DURATION_DAYS,
        sessionsPerDay: 1,
        defaultPrice: DEFAULT_PRICE,
        eligibleConditions: [regionName],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (!Number(program.defaultPrice)) {
    program.defaultPrice = DEFAULT_PRICE;
    await program.save();
  }
  return { action: 'created', program };
}

async function ensurePostOpProgram(surgery) {
  const region = surgery.bodyRegion;
  if (!region?._id) return null;

  const programCode = `POSTOP-${codePart(surgery.code || surgery.name)}`;
  const existing = await Program.findOne({ programCode });
  if (existing) {
    let changed = false;
    if (String(existing.painCategory || '') !== String(region._id)) {
      existing.painCategory = region._id;
      changed = true;
    }
    if (!existing.isActive) {
      existing.isActive = true;
      changed = true;
    }
    if (!Number(existing.defaultPrice)) {
      existing.defaultPrice = DEFAULT_PRICE;
      changed = true;
    }
    if (changed) await existing.save();
    return { action: changed ? 'updated' : 'covered', program: existing };
  }

  const program = await Program.create({
    programCode,
    name: `${surgery.name} Rehabilitation`,
    painCategory: region._id,
    description: `Post-surgery rehabilitation programme shell for ${surgery.name}. A clinician must select/approve this programme before patient payment. Configure exercises and progression before production use.`,
    objective: `Provide clinician-approved rehabilitation content after ${surgery.name}.`,
    difficultyLevel: 'post_operative',
    durationDays: DEFAULT_DURATION_DAYS,
    sessionsPerDay: 1,
    defaultPrice: DEFAULT_PRICE,
    eligibleConditions: [surgery.name],
    isActive: true,
  });
  return { action: 'created', program };
}

async function run() {
  if (!Number.isFinite(DEFAULT_PRICE) || DEFAULT_PRICE <= 0) {
    throw new Error('SEED_REHAB_PROGRAM_PRICE must be a positive number');
  }
  if (!Number.isInteger(DEFAULT_DURATION_DAYS) || DEFAULT_DURATION_DAYS < 1) {
    throw new Error('SEED_REHAB_PROGRAM_DURATION_DAYS must be a positive integer');
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI or MONGO_URI is required');
  await mongoose.connect(uri);

  const summary = { created: 0, updated: 0, covered: 0, bodyRegions: 0, surgeryPrograms: 0 };
  const regions = new Map();

  for (const regionName of BODY_REGIONS) {
    const region = await resolveRegion(regionName);
    regions.set(regionName, region);
    const result = await ensureBaseProgram(regionName, region);
    summary[result.action] += 1;
    summary.bodyRegions += 1;
    console.log(`[${result.action}] ${regionName} -> ${result.program.name}`);
  }

  const surgeries = await SurgeryType.find({ isActive: true })
    .populate('bodyRegion', 'name isActive')
    .sort({ displayOrder: 1, name: 1 });

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
  console.log(`Default price: ₹${DEFAULT_PRICE}; default duration: ${DEFAULT_DURATION_DAYS} days.`);
  console.log('Programme shells are active and mapped. Add clinically reviewed exercises/videos before production patient use.');
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
