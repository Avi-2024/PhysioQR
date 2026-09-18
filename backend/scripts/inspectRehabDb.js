require('dotenv').config();

const mongoose = require('mongoose');

const TARGET_COLLECTIONS = ['exercises', 'programdays', 'programs', 'patientprograms'];
const VIDEO_KEYS = /video|youtube|thumbnail/i;

function hasVideoLikeKey(value, path = '') {
  if (!value || typeof value !== 'object') return [];
  const hits = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (VIDEO_KEYS.test(key) && child !== undefined && child !== null && String(child).trim() !== '') {
      hits.push({ path: nextPath, value: child });
    }
    if (child && typeof child === 'object' && !Buffer.isBuffer(child)) {
      hits.push(...hasVideoLikeKey(child, nextPath));
    }
  }
  return hits;
}

async function printCollection(db, name) {
  const collection = db.collection(name);
  const count = await collection.countDocuments();
  console.log(`\n=== ${name} (${count}) ===`);

  let query = {};
  if (name === 'programs') {
    query = { $or: [
      { programCode: /THIGH/i },
      { name: /THIGH/i },
      { programCode: /AUTO-/i },
    ] };
  }

  const docs = await collection.find(query).sort({ createdAt: 1, _id: 1 }).limit(200).toArray();
  for (const doc of docs) {
    console.log(JSON.stringify(doc, null, 2));
  }
}

async function scanAllCollectionsForVideoData(db) {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  console.log('\n=== VIDEO/YOUTUBE FIELD SCAN ACROSS ALL COLLECTIONS ===');

  let totalHits = 0;
  for (const { name } of collections) {
    const sample = await db.collection(name).find({}).limit(500).toArray();
    const matches = [];

    for (const doc of sample) {
      const hits = hasVideoLikeKey(doc);
      if (hits.length) matches.push({ _id: doc._id, hits });
    }

    if (matches.length) {
      totalHits += matches.length;
      console.log(`\n[${name}] ${matches.length} document(s) with video-like data`);
      for (const item of matches) console.log(JSON.stringify(item, null, 2));
    }
  }

  console.log(`\nTotal documents containing video/youtube/thumbnail-like fields: ${totalHits}`);
}

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI or MONGO_URI is required');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  console.log('Connected database:', db.databaseName);
  console.log('Collections:', collections.map((item) => item.name).sort().join(', '));

  for (const name of TARGET_COLLECTIONS) {
    if (collections.some((item) => item.name === name)) {
      await printCollection(db, name);
    } else {
      console.log(`\n=== ${name} ===\n[collection not found]`);
    }
  }

  await scanAllCollectionsForVideoData(db);

  console.log('\nRead-only inspection complete. No database records were changed.');
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
