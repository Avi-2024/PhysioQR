const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Patient = require('../models/Patient.model');
const { ACCESS_COOKIE_NAME } = require('../services/authSession.service');

// Extracts access token from Authorization header or HTTP-only cookie.
const getAccessToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1];
  return req.cookies?.[ACCESS_COOKIE_NAME];
};

// Verifies JWT access token and resolves the authenticated account.
const protect = async (req, res, next) => {
  const token = getAccessToken(req);
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.tokenType === 'patient' || decoded.role === 'patient') {
      const patient = await Patient.findById(decoded.id);
      if (!patient) return res.status(401).json({ message: 'Patient not found' });
      if (patient.status !== 'active') return res.status(403).json({ message: `Account is ${patient.status}` });
      if ((patient.tokenVersion || 0) !== (decoded.tokenVersion || 0)) return res.status(401).json({ message: 'Token has been revoked' });
      req.user = { _id: patient._id, role: 'patient', status: patient.status, tokenVersion: patient.tokenVersion || 0 };
      req.auth = { tokenType: 'patient', sessionId: decoded.sessionId };
      return next();
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.status !== 'active') return res.status(403).json({ message: `Account is ${user.status}` });
    if ((user.tokenVersion || 0) !== (decoded.tokenVersion || 0)) return res.status(401).json({ message: 'Token has been revoked' });

    req.user = user;
    req.auth = { tokenType: 'user', sessionId: decoded.sessionId };
    return next();
  } catch {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};

// Restricts access to specific roles.
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: `Access denied for role: ${req.user.role}` });
  }
  next();
};

module.exports = { protect, authorize };
