const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Patient = require('../models/Patient.model');

// Verifies the JWT token from the Authorization header.
// Works for both User (admin/agent/doctor) and Patient tokens.
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.tokenType === 'patient' || decoded.role === 'patient') {
      const patient = await Patient.findById(decoded.id);
      if (!patient) return res.status(401).json({ message: 'Patient not found' });
      if (patient.status !== 'active') return res.status(403).json({ message: `Account is ${patient.status}` });
      req.user = { _id: patient._id, role: 'patient', status: patient.status };
      return next();
    }

    const user = await User.findById(decoded.id).select('-password');
    if (user) {
      if (user.status !== 'active') return res.status(403).json({ message: `Account is ${user.status}` });
      req.user = user;
      return next();
    }

    const patient = await Patient.findById(decoded.id);
    if (patient) {
      if (patient.status !== 'active') return res.status(403).json({ message: `Account is ${patient.status}` });
      req.user = { _id: patient._id, role: 'patient', status: patient.status };
      return next();
    }

    return res.status(401).json({ message: 'User not found' });
  } catch {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};

// Restrict access to specific roles.
// Usage: authorize('admin') or authorize('admin', 'agent')
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: `Access denied for role: ${req.user.role}` });
  }
  next();
};

module.exports = { protect, authorize };
