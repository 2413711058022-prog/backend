const { query } = require('../config/database');
const { success, paginated, error } = require('../utils/response.utils');
const { asyncHandler } = require('../middleware/error.middleware');

// ── My results ────────────────────────────────────────────────────────────────
exports.myResults = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;

  const sql = `SELECT a.id, a.exam_id, e.title AS exam_title, a.score, a.total_marks,
     a.percentage, a.passed, a.time_taken_secs, a.tab_switches, a.submitted_at, a.status,
     c.cert_number
     FROM exam_attempts a
     JOIN exams e ON a.exam_id=e.id
     LEFT JOIN certificates c ON c.attempt_id=a.id
     WHERE a.user_id=? AND a.status='submitted'
     ORDER BY a.submitted_at DESC LIMIT ${limitNum} OFFSET ${offset}`;

  const rows = await query(sql, [req.user.id]);
  const [{ total }] = await query(
    "SELECT COUNT(*) AS total FROM exam_attempts WHERE user_id=? AND status='submitted'",
    [req.user.id]
  );
  return paginated(res, rows, total, pageNum, limitNum);
});

// ── Get single result ─────────────────────────────────────────────────────────
exports.getResult = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT a.*, e.title AS exam_title, e.pass_percentage, e.marks_per_question,
     e.negative_marking, c.cert_number
     FROM exam_attempts a
     JOIN exams e ON a.exam_id=e.id
     LEFT JOIN certificates c ON c.attempt_id=a.id
     WHERE a.id=? AND (a.user_id=? OR ? = 'admin')`,
    [req.params.attemptId, req.user.id, req.user.role]
  );
  if (!rows.length) return error(res, 'Result not found', 404);
  return success(res, rows[0]);
});

// ── Review attempt (with correct answers) ─────────────────────────────────────
exports.reviewAttempt = asyncHandler(async (req, res) => {
  const attempt = await query(
    'SELECT id, user_id FROM exam_attempts WHERE id=?',
    [req.params.attemptId]
  );
  if (!attempt.length) return error(res, 'Attempt not found', 404);
  if (attempt[0].user_id !== req.user.id && req.user.role !== 'admin') {
    return error(res, 'Forbidden', 403);
  }

  const answers = await query(
    `SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
     q.correct_answer, q.explanation, aa.selected_ans, aa.is_correct, aa.is_marked
     FROM attempt_answers aa
     JOIN questions q ON aa.question_id=q.id
     WHERE aa.attempt_id=?
     ORDER BY q.id`,
    [req.params.attemptId]
  );
  return success(res, answers);
});

// ── Leaderboard ───────────────────────────────────────────────────────────────
exports.leaderboard = asyncHandler(async (req, res) => {
  const { exam_id, limit = 20 } = req.query;
  let sql = `SELECT u.name, u.department,
    MAX(a.percentage) AS best_percentage,
    MAX(a.score) AS best_score,
    COUNT(a.id) AS attempts,
    SUM(CASE WHEN a.passed=1 THEN 1 ELSE 0 END) AS passes
    FROM exam_attempts a
    JOIN users u ON a.user_id=u.id
    WHERE a.status='submitted'`;
  const params = [];
  if (exam_id) { sql += ' AND a.exam_id=?'; params.push(exam_id); }
  const limitNum = parseInt(limit);
  sql += ` GROUP BY a.user_id ORDER BY best_percentage DESC, best_score DESC LIMIT ${limitNum}`;

  const rows = await query(sql, params);
  return success(res, rows);
});
