require('dotenv').config();

const mongoose = require('mongoose');
const PainCategory = require('../src/models/PainCategory.model');
const CaseType = require('../src/models/CaseType.model');
const SurgeryType = require('../src/models/SurgeryType.model');

const bodyRegions = [
  'Neck', 'Shoulder', 'Elbow', 'Wrist/Hand', 'Upper Back', 'Lower Back',
  'Spine', 'Hip', 'Thigh', 'Knee', 'Lower Leg', 'Ankle/Foot', 'Other',
];

const surgeries = {
  Knee: [
    ['total_knee_replacement', 'Total Knee Replacement (TKR)'],
    ['acl_reconstruction', 'ACL Reconstruction'],
    ['pcl_reconstruction', 'PCL Reconstruction'],
    ['meniscus_surgery', 'Meniscus Surgery'],
    ['mcl_lcl_surgery', 'MCL/LCL Surgery'],
    ['other_knee_surgery', 'Other Knee Surgery'],
  ],
  Shoulder: [
    ['rotator_cuff_repair', 'Rotator Cuff Repair'],
    ['shoulder_replacement', 'Shoulder Replacement'],
    ['labral_repair', 'Labral Repair'],
    ['shoulder_stabilisation', 'Stabilisation Surgery'],
    ['other_shoulder_surgery', 'Other Shoulder Surgery'],
  ],
  Hip: [
    ['total_hip_replacement', 'Total Hip Replacement'],
    ['hip_fracture_surgery', 'Hip Fracture Surgery'],
    ['hip_labral_surgery', 'Labral Surgery'],
    ['other_hip_surgery', 'Other Hip Surgery'],
  ],
  Spine: [
    ['discectomy', 'Discectomy'],
    ['spinal_fusion', 'Spinal Fusion'],
    ['spinal_decompression', 'Decompression'],
    ['other_spine_surgery', 'Other Spine Surgery'],
  ],
  'Ankle/Foot': [['other_ankle_foot_surgery', 'Other Ankle/Foot Surgery']],
  Elbow: [['other_elbow_surgery', 'Other Elbow Surgery']],
  'Wrist/Hand': [['other_wrist_hand_surgery', 'Other Wrist/Hand Surgery']],
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function ensureBodyRegion(name) {
  const aliases = [name, `${name} Pain`];
  let region = await PainCategory.findOne({ name: { $in: aliases.map((value) => new RegExp(`^${escapeRegex(value)}$`, 'i')) } });
  if (!region) region = await PainCategory.create({ name, description: `${name} rehabilitation body region`, isActive: true });
  else if (!region.isActive) { region.isActive = true; await region.save(); }
  return region;
}

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI or MONGO_URI is required');
  await mongoose.connect(uri);

  await CaseType.findOneAndUpdate(
    { code: 'msk' },
    {
      $set: {
        name: 'Pain / Injury / Movement',
        description: 'Non-surgical musculoskeletal assessment pathway',
        requiresSurgeryDetails: false,
        requiresPhysioReview: false,
        displayOrder: 10,
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await CaseType.findOneAndUpdate(
    { code: 'post_surgery' },
    {
      $set: {
        name: 'Post-Surgery Rehabilitation',
        description: 'Post-operative pathway requiring surgery details and clinical review before programme assignment',
        requiresSurgeryDetails: true,
        requiresPhysioReview: true,
        displayOrder: 20,
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const regions = new Map();
  for (const name of bodyRegions) regions.set(name, await ensureBodyRegion(name));

  for (const [regionName, items] of Object.entries(surgeries)) {
    const region = regions.get(regionName);
    for (let index = 0; index < items.length; index += 1) {
      const [code, name] = items[index];
      await SurgeryType.findOneAndUpdate(
        { code },
        {
          $set: {
            name,
            bodyRegion: region._id,
            requiresPhysioReview: true,
            displayOrder: (index + 1) * 10,
            isActive: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
  }

  console.log('Assessment pathways seeded successfully.');
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
