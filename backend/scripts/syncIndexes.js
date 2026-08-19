require('dotenv').config();

const mongoose = require('mongoose');

require('../src/models/Agent.model');
require('../src/models/AssessmentQuestion.model');
require('../src/models/AuditLog.model');
require('../src/models/AuthSession.model');
require('../src/models/ClinicVisit.model');
require('../src/models/Counter.model');
require('../src/models/Coupon.model');
require('../src/models/Doctor.model');
require('../src/models/Exercise.model');
require('../src/models/FeeShare.model');
require('../src/models/FraudCase.model');
require('../src/models/Notification.model');
require('../src/models/Otp.model');
require('../src/models/PainCategory.model');
require('../src/models/Patient.model');
require('../src/models/PatientAssessment.model');
require('../src/models/PatientConsent.model');
require('../src/models/PatientProgram.model');
require('../src/models/Payment.model');
require('../src/models/Payout.model');
require('../src/models/Program.model');
require('../src/models/ProgramProgress.model');
require('../src/models/QrScan.model');
require('../src/models/Refund.model');
require('../src/models/SupportTicket.model');
require('../src/models/SystemSettings.model');
require('../src/models/User.model');
require('../src/models/Wallet.model');

// Synchronizes declared Mongoose indexes for production deployment.
const main = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI);

  const results = [];
  for (const modelName of mongoose.modelNames().sort()) {
    const model = mongoose.model(modelName);
    const result = await model.syncIndexes();
    results.push({ model: modelName, result });
  }

  console.log(JSON.stringify({ ok: true, models: results }, null, 2));
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
