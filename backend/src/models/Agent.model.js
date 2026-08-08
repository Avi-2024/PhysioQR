const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  agentId: { type: String, unique: true },   // e.g. AG001
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true },
  mobile: { type: String, required: true },
  whatsapp: String,
  email: String,
  address: String,
  city: String,
  state: String,
  assignedRegion: String,
  joiningDate: Date,
  reportingPerson: String,
  profilePhoto: String,
  identityProof: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'terminated'],
    default: 'active',
  },
}, { timestamps: true });

// Auto-generate agentId like AG00001 before saving
agentSchema.pre('save', async function (next) {
  if (this.agentId) return next();
  const count = await mongoose.model('Agent').countDocuments();
  this.agentId = `AG${String(count + 1).padStart(5, '0')}`;
  next();
});

module.exports = mongoose.model('Agent', agentSchema);
