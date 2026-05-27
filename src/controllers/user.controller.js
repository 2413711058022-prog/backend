const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { success, error } = require('../utils/response.utils');
const { asyncHandler } = require('../middleware/error.middleware');

exports.getProfile = asyncHandler(async (req, res) => {
  const users = await query(
    'SELECT u.id,u.name,u.email,u.phone,u.department,u.employee_id,u.avatar_url,u.created_at,r.name AS role FROM users u JOIN roles r ON u.role_id=r.id WHERE u.id=?',
    [req.user.id]
  );
  return success(res, users[0]);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, department } = req.body;
  await query(
    'UPDATE users SET name=COALESCE(?,name), phone=COALESCE(?,phone), department=COALESCE(?,department) WHERE id=?',
    [name, phone, department, req.user.id]
  );
  return success(res, {}, 'Profile updated');
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return error(res, 'Both passwords required', 400);
  if (newPassword.length < 6) return error(res, 'Password must be at least 6 characters', 400);

  const users = await query('SELECT password_hash FROM users WHERE id=?', [req.user.id]);
  const valid = await bcrypt.compare(currentPassword, users[0].password_hash);
  if (!valid) return error(res, 'Current password is incorrect', 401);

  const hash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash=? WHERE id=?', [hash, req.user.id]);
  return success(res, {}, 'Password changed successfully');
});

exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) return error(res, 'No file uploaded', 400);
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  await query('UPDATE users SET avatar_url=? WHERE id=?', [avatarUrl, req.user.id]);
  return success(res, { avatarUrl }, 'Avatar updated');
});
