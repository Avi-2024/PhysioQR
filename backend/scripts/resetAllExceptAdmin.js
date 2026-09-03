require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User.model');

const PRODUCTION_CONFIRMATION = 'I_UNDERSTAND_THIS_DELETES_ALL_NON_ADMIN_DATA';

async function resetAllExceptAdmin() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_FULL_DATA_RESET !== PRODUCTION_CONFIRMATION) {
    throw new Error(
      `Refusing to reset production data. Set ALLOW_FULL_DATA_RESET=${PRODUCTION_CONFIRMATION} only when you explicitly intend to wipe all non-admin data.`
    );
  }

  await connectDB();

  const admins = await User.find({ role: 'admin' }).select('_id email mobile status').lean();
  if (!admins.length) {
    throw new Error('Reset aborted: no admin account exists. Nothing was deleted.');
  }

  console.log(`Preserving ${admins.length} admin account(s):`);
  admins.forEach((admin) => console.log(` - ${admin.email || admin.mobile || admin._id}`));

  const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
  let totalDeleted = 0;

  for (const { name } of collections) {
    const collection = mongoose.connection.db.collection(name);

    if (name === User.collection.collectionName) {
      const result = await collection.deleteMany({ role: { $ne: 'admin' } });
      totalDeleted += result.deletedCount || 0;
      console.log(`users: deleted ${result.deletedCount || 0}, preserved admins`);
      continue;
    }

    const result = await collection.deleteMany({});
    totalDeleted += result.deletedCount || 0;
    console.log(`${name}: deleted ${result.deletedCount || 0}`);
  }

  const remainingAdmins = await User.countDocuments({ role: 'admin' });
  const remainingNonAdmins = await User.countDocuments({ role: { $ne: 'admin' } });

  console.log('\nReset complete.');
  console.log(`Total deleted documents: ${totalDeleted}`);
  console.log(`Remaining admin accounts: ${remainingAdmins}`);
  console.log(`Remaining non-admin users: ${remainingNonAdmins}`);
  console.log('All other collections were emptied. Collection indexes were preserved.');
}

resetAllExceptAdmin()
  .catch((error) => {
    console.error(`Reset failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
