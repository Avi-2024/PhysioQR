const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// This single model handles Admin, Agent, and Doctor login
const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['admin', 'agent', 'doctor'],
    required: true,
  },
  email: { type: String, unique: true, sparse: true },
  mobile: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  mustChangePassword: { type: Boolean, default: false },
  passwordChangedAt: Date,
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'terminated'],
    default: 'active',
  },
  // Links to the role-specific profile
  profileRef: { type: mongoose.Schema.Types.ObjectId, refPath: 'profileModel' },
  profileModel: { type: String, enum: ['Agent', 'Doctor'] },
  tokenVersion: { type: Number, default: 0 },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password helper
userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
