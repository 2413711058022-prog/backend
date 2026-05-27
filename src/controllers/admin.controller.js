const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { success, created, paginated, error } = require('../utils/response.utils');
const { asyncHandler } = require('../middleware/error.middleware');
const XLSX = require('xlsx');
const fs = require('fs');

// ── List users ────────────────────────────────────────────────────────────────
exports.listUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;
  const params = [];
  let where = 'WHERE 1=1';

  if (search) { where += ' AND (u.name LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (role) { where += ' AND r.name=?'; params.push(role); }

  // Build query with LIMIT/OFFSET directly in SQL to avoid MySQL parameter issues
  const sql = `SELECT u.id, u.name, u.email, u.phone, u.department, u.employee_id,
     u.is_active, u.last_login, u.created_at, r.name AS role
     FROM users u JOIN roles r ON u.role_id=r.id ${where}
     ORDER BY u.created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;

  const rows = await query(sql, params);
  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM users u JOIN roles r ON u.role_id=r.id ${where}`, params
  );
  return paginated(res, rows, total, pageNum, limitNum);
});

// ── Create user ───────────────────────────────────────────────────────────────
exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'student', phone, department, employee_id } = req.body;

  const existing = await query('SELECT id FROM users WHERE email=?', [email]);
  if (existing.length) return error(res, 'Email already exists', 409);

  const roles = await query('SELECT id FROM roles WHERE name=?', [role]);
  if (!roles.length) return error(res, 'Invalid role', 400);

  const id = uuidv4();
  const password_hash = await bcrypt.hash(password || 'Welcome@123', 12);

  await query(
    'INSERT INTO users (id,name,email,password_hash,role_id,phone,department,employee_id,email_verified) VALUES (?,?,?,?,?,?,?,?,TRUE)',
    [id, name, email, password_hash, roles[0].id, phone || null, department || null, employee_id || null]
  );
  return created(res, { id }, 'User created');
});

// ── Update user ───────────────────────────────────────────────────────────────
exports.updateUser = asyncHandler(async (req, res) => {
  const { name, phone, department, employee_id, is_active } = req.body;
  await query(
    'UPDATE users SET name=COALESCE(?,name), phone=COALESCE(?,phone), department=COALESCE(?,department), employee_id=COALESCE(?,employee_id), is_active=COALESCE(?,is_active) WHERE id=?',
    [name, phone, department, employee_id, is_active, req.params.id]
  );
  return success(res, {}, 'User updated');
});

// ── Delete / deactivate user ──────────────────────────────────────────────────
exports.deleteUser = asyncHandler(async (req, res) => {
  await query('UPDATE users SET is_active=FALSE WHERE id=?', [req.params.id]);
  return success(res, {}, 'User deactivated');
});

// ── Bulk upload users from Excel ──────────────────────────────────────────────
exports.bulkUploadUsers = asyncHandler(async (req, res) => {
  if (!req.file) return error(res, 'No file uploaded', 400);

  const workbook = XLSX.readFile(req.file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  let created_count = 0, skipped = 0;
  const studentRoleId = 2;

  for (const row of rows) {
    try {
      const existing = await query('SELECT id FROM users WHERE email=?', [row.email]);
      if (existing.length) { skipped++; continue; }

      const id = uuidv4();
      const password_hash = await bcrypt.hash(row.password || 'Welcome@123', 12);
      await query(
        'INSERT INTO users (id,name,email,password_hash,role_id,phone,department,employee_id,email_verified) VALUES (?,?,?,?,?,?,?,?,TRUE)',
        [id, row.name, row.email, password_hash, studentRoleId,
         row.phone || null, row.department || null, row.employee_id || null]
      );
      created_count++;
    } catch (e) { skipped++; }
  }

  fs.unlinkSync(req.file.path);
  return success(res, { created: created_count, skipped }, `Uploaded ${created_count} users`);
});

// ── All attempts ──────────────────────────────────────────────────────────────
exports.listAttempts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, exam_id } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;
  const params = [];
  let where = "WHERE a.status='submitted'";
  if (exam_id) { where += ' AND a.exam_id=?'; params.push(exam_id); }

  const sql = `SELECT a.id, u.name AS student_name, u.email, e.title AS exam_title,
     a.score, a.total_marks, a.percentage, a.passed, a.submitted_at, a.tab_switches
     FROM exam_attempts a
     JOIN users u ON a.user_id=u.id
     JOIN exams e ON a.exam_id=e.id
     ${where} ORDER BY a.submitted_at DESC LIMIT ${limitNum} OFFSET ${offset}`;

  const rows = await query(sql, params);
  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM exam_attempts a ${where}`, params
  );
  return paginated(res, rows, total, pageNum, limitNum);
});

// ── Activity logs ─────────────────────────────────────────────────────────────
exports.activityLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;
  
  const sql = `SELECT l.*, u.name AS user_name FROM activity_logs l
     LEFT JOIN users u ON l.user_id=u.id
     ORDER BY l.created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
  
  const rows = await query(sql);
  const [{ total }] = await query('SELECT COUNT(*) AS total FROM activity_logs');
  return paginated(res, rows, total, pageNum, limitNum);
});
