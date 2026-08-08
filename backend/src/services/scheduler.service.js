const PatientProgram = require('../models/PatientProgram.model');
const { FeeShare } = require('../models/FeeShare.model');
const { DoctorWallet, WalletTransaction } = require('../models/Wallet.model');

/**
 * SRS §21.2 — Mark programs as expired when past expiry + grace period.
 * Run this daily.
 */
const expirePrograms = async () => {
  const now = new Date();

  const expired = await PatientProgram.find({
    status: 'active',
    expiryDate: { $lt: now },
  });

  for (const program of expired) {
    program.status = 'expired';
    await program.save();
    console.log(`Program expired: ${program._id}`);
  }

  console.log(`[Scheduler] expirePrograms: ${expired.length} programs expired`);
};

/**
 * SRS §30 — Release fee shares whose holding period has ended.
 * Moves status from 'pending' → 'available' and updates wallet balance.
 * Run this daily.
 */
const releaseFeeShares = async () => {
  const now = new Date();

  const readyShares = await FeeShare.find({
    status: 'pending',
    availableDate: { $lte: now },
  });

  for (const share of readyShares) {
    const wallet = await DoctorWallet.findOne({ doctor: share.doctor });
    if (!wallet) continue;

    const prev = wallet.availableBalance;
    wallet.pendingBalance = Math.max(0, wallet.pendingBalance - share.amount);
    wallet.availableBalance += share.amount;
    await wallet.save();

    await WalletTransaction.create({
      doctor: share.doctor,
      wallet: wallet._id,
      relatedPayment: share.payment,
      type: 'fee_share_released',
      amount: share.amount,
      previousBalance: prev,
      newBalance: wallet.availableBalance,
      reason: `Fee share holding period completed. Available from ${share.availableDate.toDateString()}`,
    });

    share.status = 'available';
    await share.save();
  }

  console.log(`[Scheduler] releaseFeeShares: ${readyShares.length} fee shares released`);
};

/**
 * Start all scheduled jobs.
 * Runs every 24 hours.
 */
const startScheduler = () => {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  // Run immediately on startup, then every 24 hours
  const run = async () => {
    try {
      await expirePrograms();
      await releaseFeeShares();
    } catch (err) {
      console.error('[Scheduler] Error:', err.message);
    }
  };

  run();
  setInterval(run, TWENTY_FOUR_HOURS);
  console.log('✅ Scheduler started');
};

module.exports = { startScheduler, expirePrograms, releaseFeeShares };
