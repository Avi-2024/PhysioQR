require('dotenv').config();

const mongoose = require('mongoose');
const notificationService = require('../src/services/notification.service');

// Runs one notification delivery retry batch for background schedulers.
const runOnce = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI);
  const notifications = await notificationService.processPendingNotifications({
    limit: Number(process.env.NOTIFICATION_WORKER_BATCH_SIZE || 50),
    includeFailed: true,
  });
  console.log(JSON.stringify({
    ok: true,
    processed: notifications.length,
    sent: notifications.filter((item) => item.status === 'sent').length,
    failed: notifications.filter((item) => item.status === 'failed').length,
  }));
};

runOnce()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
