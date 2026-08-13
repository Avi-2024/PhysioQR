require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../src/models/User.model');

const run = async () => {
  const { MONGO_URI, ADMIN_EMAIL, ADMIN_MOBILE, ADMIN_PASSWORD } = process.env;

  if (!MONGO_URI) throw new Error('MONGO_URI is required');
  if (!ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD is required');
  if (!ADMIN_EMAIL && !ADMIN_MOBILE) throw new Error('ADMIN_EMAIL or ADMIN_MOBILE is required');

  await mongoose.connect(MONGO_URI);

  const query = ADMIN_EMAIL ? { email: ADMIN_EMAIL } : { mobile: ADMIN_MOBILE };
  const existingAdmin = await User.findOne({ role: 'admin', ...query });

  if (existingAdmin) {
    existingAdmin.password = ADMIN_PASSWORD;
    existingAdmin.status = 'active';
    if (ADMIN_EMAIL) existingAdmin.email = ADMIN_EMAIL;
    if (ADMIN_MOBILE) existingAdmin.mobile = ADMIN_MOBILE;
    await existingAdmin.save();
    console.log(`Admin updated: ${ADMIN_EMAIL || ADMIN_MOBILE}`);
  } else {
    await User.create({
      role: 'admin',
      email: ADMIN_EMAIL,
      mobile: ADMIN_MOBILE,
      password: ADMIN_PASSWORD,
      status: 'active',
    });
    console.log(`Admin created: ${ADMIN_EMAIL || ADMIN_MOBILE}`);
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
