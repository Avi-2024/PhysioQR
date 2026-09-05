const User = require('../models/User.model');
const authSessionService = require('../services/authSession.service');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const clearAuthCookies = (res) => {
  res.clearCookie(authSessionService.ACCESS_COOKIE_NAME, { path: '/' });
  res.clearCookie(authSessionService.REFRESH_COOKIE_NAME, { path: '/' });
};

// POST /api/auth/change-password
// First-login setup does not ask for the temporary password again because the
// user already proved possession of it when the current authenticated session
// was created. Normal later password changes still require currentPassword.
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (req.user.role === 'patient') {
    return res.status(400).json({ message: 'Patients use OTP login and do not have a password' });
  }
  if (!newPassword) {
    return res.status(400).json({ message: 'newPassword is required' });
  }

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const isFirstLoginSetup = Boolean(user.mustChangePassword);

  if (isFirstLoginSetup) {
    // Do not allow keeping the generated temporary password as the permanent one.
    if (await user.matchPassword(newPassword)) {
      return res.status(400).json({ message: 'Choose a new password different from the temporary password' });
    }
  } else {
    if (!currentPassword) {
      return res.status(400).json({ message: 'currentPassword is required' });
    }
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from the current password' });
    }
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  user.passwordChangedAt = new Date();
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  await authSessionService.revokeOwnerSessions({
    ownerType: 'user',
    ownerId: user._id,
    reason: isFirstLoginSetup ? 'first_login_password_set' : 'password_changed',
  });
  clearAuthCookies(res);

  await writeAuditLog({
    req,
    action: isFirstLoginSetup ? 'first_login_password_set' : 'password_changed',
    module: 'User',
    recordId: user._id,
  });

  res.json({
    message: isFirstLoginSetup
      ? 'Password created successfully. Please sign in with your new password.'
      : 'Password changed successfully. Please sign in again.',
  });
});

module.exports = { changePassword };
