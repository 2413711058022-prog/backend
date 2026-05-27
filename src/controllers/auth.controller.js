const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { generateTokens, hashToken, verifyRefreshToken } = require('../utils/jwt.utils');
const { success, error, created } = require('../utils/response.utils');
const { asyncHandler } = require('../middleware/error.middleware');

// ── Register ──────────────────────────────────────────────────────────────────
exports.register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, 'Validation failed', 422, errors.array());

  const { name, email, password, phone, department, employee_id } = req.body;

  const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) return error(res, 'Email already registered', 409);

  const password_hash = await bcrypt.hash(password, 12);
  const id = uuidv4();

  await query(
    'INSERT INTO users (id,name,email,password_hash,role_id,phone,department,employee_id) VALUES (?,?,?,?,2,?,?,?)',
    [id, name, email, password_hash, phone || null, department || null, employee_id || null]
  );

  await query('INSERT INTO activity_logs (user_id,action,entity,entity_id) VALUES (?,?,?,?)',
    [id, 'REGISTER', 'users', id]);

  const { accessToken, refreshToken } = generateTokens(id, 'student');
  await storeRefreshToken(id, refreshToken);

  return created(res, { accessToken, refreshToken, user: { id, name, email, role: 'student' } },
    'Registration successful');
});

// ── Login ─────────────────────────────────────────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, 'Validation failed', 422, errors.array());

  const { email, password } = req.body;

  const users = await query(
    'SELECT u.*, r.name AS role FROM users u JOIN roles r ON u.role_id=r.id WHERE u.email=?',
    [email]
  );
  if (!users.length) return error(res, 'Invalid credentials', 401);

  const user = users[0];
  if (!user.is_active) return error(res, 'Account is deactivated', 403);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return error(res, 'Invalid credentials', 401);

  await query('UPDATE users SET last_login=NOW() WHERE id=?', [user.id]);
  await query('INSERT INTO activity_logs (user_id,action) VALUES (?,?)', [user.id, 'LOGIN']);

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  await storeRefreshToken(user.id, refreshToken);

  return success(res, {
    accessToken, refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_url: user.avatar_url }
  }, 'Login successful');
});

// ── Refresh token ─────────────────────────────────────────────────────────────
exports.refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return error(res, 'Refresh token required', 400);

  const decoded = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const stored = await query(
    'SELECT * FROM refresh_tokens WHERE user_id=? AND token_hash=? AND expires_at > NOW()',
    [decoded.userId, tokenHash]
  );
  if (!stored.length) return error(res, 'Invalid or expired refresh token', 401);

  const users = await query(
    'SELECT u.id, r.name AS role FROM users u JOIN roles r ON u.role_id=r.id WHERE u.id=?',
    [decoded.userId]
  );
  if (!users.length) return error(res, 'User not found', 401);

  const { accessToken, refreshToken: newRefresh } = generateTokens(users[0].id, users[0].role);
  await query('DELETE FROM refresh_tokens WHERE token_hash=?', [tokenHash]);
  await storeRefreshToken(users[0].id, newRefresh);

  return success(res, { accessToken, refreshToken: newRefresh });
});

// ── Logout ────────────────────────────────────────────────────────────────────
exports.logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await query('DELETE FROM refresh_tokens WHERE token_hash=?', [tokenHash]);
  }
  await query('INSERT INTO activity_logs (user_id,action) VALUES (?,?)', [req.user.id, 'LOGOUT']);
  return success(res, {}, 'Logged out successfully');
});

// ── Me ────────────────────────────────────────────────────────────────────────
exports.me = asyncHandler(async (req, res) => {
  const users = await query(
    'SELECT u.id,u.name,u.email,u.phone,u.department,u.employee_id,u.avatar_url,u.created_at,r.name AS role FROM users u JOIN roles r ON u.role_id=r.id WHERE u.id=?',
    [req.user.id]
  );
  return success(res, users[0]);
});

// ── Forgot password (stub — sends email in production) ────────────────────────
exports.forgotPassword = asyncHandler(async (req, res) => {
  // In production: generate reset token, store hash, send email
  return success(res, {}, 'If that email exists, a reset link has been sent.');
});

exports.resetPassword = asyncHandler(async (req, res) => {
  return success(res, {}, 'Password reset feature — configure SMTP in .env to enable.');
});

// ── Helper ────────────────────────────────────────────────────────────────────
async function storeRefreshToken(userId, token) {
  const id = uuidv4();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)',
    [id, userId, tokenHash, expiresAt]
  );
}
