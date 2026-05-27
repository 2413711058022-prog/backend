const { query } = require('../config/database');
const { success } = require('../utils/response.utils');
const { asyncHandler } = require('../middleware/error.middleware');

// ── Admin dashboard stats ─────────────────────────────────────────────────────
exports.adminDashboard = asyncHandler(async (req, res) => {
  const [totalStudents] = await query("SELECT COUNT(*) AS c FROM users WHERE role_id=2");
  const [totalExams] = await query("SELECT COUNT(*) AS c FROM exams");
  const [totalAttempts] = await query("SELECT COUNT(*) AS c FROM exam_attempts WHERE status='submitted'");
  const [passRate] = await query("SELECT ROUND(AVG(passed)*100,1) AS c FROM exam_attempts WHERE status='submitted'");
  const [totalQuestions] = await query("SELECT COUNT(*) AS c FROM questions WHERE status='active'");

  const dailyActivity = await query(
    `SELECT DATE(created_at) AS date, COUNT(*) AS attempts
     FROM exam_attempts WHERE status='submitted' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY DATE(created_at) ORDER BY date`
  );

  const topScorers = await query(
    `SELECT u.name, u.department, MAX(a.percentage) AS best_pct
     FROM exam_attempts a JOIN users u ON a.user_id=u.id
     WHERE a.status='submitted'
     GROUP BY a.user_id ORDER BY best_pct DESC LIMIT 5`
  );

  const subjectStats = await query(
    `SELECT t.name AS topic, COUNT(a.id) AS attempts, ROUND(AVG(a.percentage),1) AS avg_pct
     FROM exam_attempts a
     JOIN exams e ON a.exam_id=e.id
     JOIN topics t ON e.topic_id=t.id
     WHERE a.status='submitted' AND e.topic_id IS NOT NULL
     GROUP BY e.topic_id ORDER BY attempts DESC`
  );

  return success(res, {
    stats: {
      totalStudents: totalStudents.c,
      totalExams: totalExams.c,
      totalAttempts: totalAttempts.c,
      passRate: passRate.c || 0,
      totalQuestions: totalQuestions.c,
    },
    dailyActivity,
    topScorers,
    subjectStats,
  });
});

// ── Student analytics ─────────────────────────────────────────────────────────
exports.studentAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [totals] = await query(
    `SELECT COUNT(*) AS total_attempts,
     SUM(CASE WHEN passed=1 THEN 1 ELSE 0 END) AS passes,
     ROUND(AVG(percentage),1) AS avg_pct,
     MAX(percentage) AS best_pct
     FROM exam_attempts WHERE user_id=? AND status='submitted'`,
    [userId]
  );

  const recentAttempts = await query(
    `SELECT a.id, e.title, a.percentage, a.passed, a.submitted_at
     FROM exam_attempts a JOIN exams e ON a.exam_id=e.id
     WHERE a.user_id=? AND a.status='submitted'
     ORDER BY a.submitted_at DESC LIMIT 10`,
    [userId]
  );

  const subjectBreakdown = await query(
    `SELECT t.name AS topic, ROUND(AVG(a.percentage),1) AS avg_pct, COUNT(a.id) AS attempts
     FROM exam_attempts a
     JOIN exams e ON a.exam_id=e.id
     JOIN topics t ON e.topic_id=t.id
     WHERE a.user_id=? AND a.status='submitted' AND e.topic_id IS NOT NULL
     GROUP BY e.topic_id`,
    [userId]
  );

  return success(res, { totals, recentAttempts, subjectBreakdown });
});

// ── Subject-wise performance ──────────────────────────────────────────────────
exports.subjectPerformance = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const rows = await query(
    `SELECT t.name AS topic,
     COUNT(aa.id) AS total_answered,
     SUM(aa.is_correct) AS correct,
     ROUND(SUM(aa.is_correct)/COUNT(aa.id)*100,1) AS accuracy
     FROM attempt_answers aa
     JOIN questions q ON aa.question_id=q.id
     JOIN topics t ON q.topic_id=t.id
     JOIN exam_attempts a ON aa.attempt_id=a.id
     WHERE a.user_id=? AND a.status='submitted' AND aa.selected_ans IS NOT NULL
     GROUP BY q.topic_id`,
    [userId]
  );
  return success(res, rows);
});
