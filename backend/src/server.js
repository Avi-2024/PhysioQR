const app = require('./app');
const connectDB = require('./config/db');
const { startScheduler } = require('./services/scheduler.service');

require('dotenv').config();

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ PhysioQR server running on port ${PORT}`);
  });

  // Start daily jobs: program expiry + fee share release (SRS §21.2, §30)
  startScheduler();
});
