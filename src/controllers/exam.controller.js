const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');
const { success, created, paginated, error } = require('../utils/response.utils');
const { asyncHandler } = require('../middleware/error.middleware');

// ── List published exams ───────────────────────────────────────────────────────
exports.listExams = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, topic_id } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;
  const isAdmin = req.user.role === 'admin';

  let sql = `SELECT e.*, t.name AS topic_name,
    (SELECT COUNT(*) FROM exam_attempts a WHERE a.exam_id=e.id AND a.user_id=? AND a.status='submitted') AS attempts_count
    FROM exams e LEFT JOIN topics t ON e.topic_id=t.id`;
  const params = [req.user.id];

  // Students see only published exams, admins see all
  if (!isAdmin) {
    sql += ' WHERE e.is_published=TRUE';
  } else {
    sql += ' WHERE 1=1';
  }

  if (topic_id) { sql += ' AND e.topic_id=?'; params.push(topic_id); }
  sql += ` ORDER BY e.created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;

  const rows = await query(sql, params);
  const countSql = isAdmin ? 'SELECT COUNT(*) AS total FROM exams' : 'SELECT COUNT(*) AS total FROM exams WHERE is_published=TRUE';
  const [{ total }] = await query(countSql);
  return paginated(res, rows, total, pageNum, limitNum);
});

// ── Get single exam (without answers) ────────────────────────────────────────
exports.getExam = asyncHandler(async (req, res) => {
  const exams = await query(
    'SELECT e.*, t.name AS topic_name FROM exams e LEFT JOIN topics t ON e.topic_id=t.id WHERE e.id=?',
    [req.params.id]
  );
  if (!exams.length) return error(res, 'Exam not found', 404);
  return success(res, exams[0]);
});

// ── Start attempt ─────────────────────────────────────────────────────────────
exports.startAttempt = asyncHandler(async (req, res) => {
  const examId = req.params.id;
  const userId = req.user.id;

  const exams = await query('SELECT * FROM exams WHERE id=? AND is_published=TRUE', [examId]);
  if (!exams.length) return error(res, 'Exam not found or not published', 404);
  const exam = exams[0];

  // Check for existing in-progress attempt
  const existing = await query(
    'SELECT id FROM exam_attempts WHERE exam_id=? AND user_id=? AND status=?',
    [examId, userId, 'in_progress']
  );
  if (existing.length) {
    // Resume existing attempt
    const questions = await getExamQuestions(examId, existing[0].id);
    return success(res, { attemptId: existing[0].id, questions, exam });
  }

  // Fetch questions (randomized if enabled)
  const totalQuestionsNum = Number(exam.total_questions);
  let qSql = `SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.topic_id
    FROM questions q
    JOIN exam_questions eq ON q.id=eq.question_id
    WHERE eq.exam_id=? AND q.status='active'`;
  if (exam.randomize_questions) qSql += ' ORDER BY RAND()';
  qSql += ` LIMIT ${totalQuestionsNum}`;

  const questions = await query(qSql, [examId]);
  if (!questions.length) return error(res, 'No questions available for this exam', 422);

  const attemptId = uuidv4();
  await transaction(async (conn) => {
    await conn.execute(
      'INSERT INTO exam_attempts (id,exam_id,user_id,status) VALUES (?,?,?,?)',
      [attemptId, examId, userId, 'in_progress']
    );
    // Pre-insert blank answer rows
    for (const q of questions) {
      await conn.execute(
        'INSERT INTO attempt_answers (attempt_id,question_id) VALUES (?,?)',
        [attemptId, q.id]
      );
    }
  });

  await query('INSERT INTO activity_logs (user_id,action,entity,entity_id) VALUES (?,?,?,?)',
    [userId, 'START_EXAM', 'exams', examId]);

  return created(res, { attemptId, questions, exam }, 'Exam started');
});

// ── Save single answer ────────────────────────────────────────────────────────
exports.saveAnswer = asyncHandler(async (req, res) => {
  const { attemptId, questionId, selectedAns, isMarked } = req.body;

  const attempt = await query(
    'SELECT id FROM exam_attempts WHERE id=? AND user_id=? AND status=?',
    [attemptId, req.user.id, 'in_progress']
  );
  if (!attempt.length) return error(res, 'Invalid or expired attempt', 400);

  await query(
    'UPDATE attempt_answers SET selected_ans=?, is_marked=?, answered_at=NOW() WHERE attempt_id=? AND question_id=?',
    [selectedAns || null, isMarked ? 1 : 0, attemptId, questionId]
  );

  // Track tab switches
  if (req.body.tabSwitch) {
    await query('UPDATE exam_attempts SET tab_switches=tab_switches+1 WHERE id=?', [attemptId]);
  }

  return success(res, {}, 'Answer saved');
});

// ── Submit attempt ────────────────────────────────────────────────────────────
exports.submitAttempt = asyncHandler(async (req, res) => {
  const { attemptId, timeTakenSecs } = req.body;
  const userId = req.user.id;

  const attempts = await query(
    'SELECT a.*, e.marks_per_question, e.negative_marking, e.pass_percentage, e.total_questions FROM exam_attempts a JOIN exams e ON a.exam_id=e.id WHERE a.id=? AND a.user_id=? AND a.status=?',
    [attemptId, userId, 'in_progress']
  );
  if (!attempts.length) return error(res, 'Attempt not found or already submitted', 400);
  const attempt = attempts[0];

  // Fetch answers with correct answers
  const answers = await query(
    `SELECT aa.question_id, aa.selected_ans, q.correct_answer
     FROM attempt_answers aa JOIN questions q ON aa.question_id=q.id
     WHERE aa.attempt_id=?`,
    [attemptId]
  );

  let score = 0;
  const totalMarks = attempt.total_questions * attempt.marks_per_question;

  for (const ans of answers) {
    const isCorrect = ans.selected_ans && ans.selected_ans.trim() === ans.correct_answer.trim();
    await query(
      'UPDATE attempt_answers SET is_correct=? WHERE attempt_id=? AND question_id=?',
      [isCorrect ? 1 : 0, attemptId, ans.question_id]
    );
    if (isCorrect) {
      score += parseFloat(attempt.marks_per_question);
    } else if (ans.selected_ans) {
      score -= parseFloat(attempt.negative_marking);
    }
  }

  score = Math.max(0, score);
  const percentage = (score / totalMarks) * 100;
  const passed = percentage >= parseFloat(attempt.pass_percentage);

  await query(
    'UPDATE exam_attempts SET status=?, submitted_at=NOW(), score=?, total_marks=?, percentage=?, passed=?, time_taken_secs=? WHERE id=?',
    ['submitted', score, totalMarks, percentage.toFixed(2), passed ? 1 : 0, timeTakenSecs || 0, attemptId]
  );

  // Issue certificate if passed
  let certNumber = null;
  if (passed) {
    certNumber = `CERT-${Date.now()}-${userId.slice(0, 8).toUpperCase()}`;
    const certId = uuidv4();
    await query(
      'INSERT IGNORE INTO certificates (id,user_id,attempt_id,cert_number) VALUES (?,?,?,?)',
      [certId, userId, attemptId, certNumber]
    );
  }

  await query('INSERT INTO activity_logs (user_id,action,entity,entity_id) VALUES (?,?,?,?)',
    [userId, 'SUBMIT_EXAM', 'exam_attempts', attemptId]);

  return success(res, {
    score, totalMarks, percentage: percentage.toFixed(2), passed, certNumber,
    correctAnswers: answers.filter(a => a.selected_ans?.trim() === a.correct_answer?.trim()).length,
    totalQuestions: answers.length,
  }, 'Exam submitted successfully');
});

// ── Admin: Create exam ────────────────────────────────────────────────────────
exports.createExam = asyncHandler(async (req, res) => {
  const { title, description, topic_id, total_questions, duration_minutes,
    pass_percentage, negative_marking, marks_per_question, randomize_questions, question_ids } = req.body;

  const id = uuidv4();
  await transaction(async (conn) => {
    await conn.execute(
      `INSERT INTO exams (id,title,description,topic_id,total_questions,duration_minutes,
       pass_percentage,negative_marking,marks_per_question,randomize_questions,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, title, description || null, topic_id || null, total_questions || 10,
       duration_minutes || 30, pass_percentage || 40, negative_marking || 0,
       marks_per_question || 1, randomize_questions ? 1 : 1, req.user.id]
    );

    if (question_ids?.length) {
      // Manual question selection
      for (let i = 0; i < question_ids.length; i++) {
        await conn.execute(
          'INSERT INTO exam_questions (exam_id,question_id,order_no) VALUES (?,?,?)',
          [id, question_ids[i], i + 1]
        );
      }
    } else {
      // Auto-assign questions
      const totalQuestionsNum = Number(total_questions || 10);
      let qs;
      
      if (topic_id) {
        // Auto-assign from specific topic
        [qs] = await conn.execute(
          `SELECT id FROM questions WHERE topic_id=? AND status=? ORDER BY RAND() LIMIT ${totalQuestionsNum}`,
          [topic_id, 'active']
        );
      } else {
        // Auto-assign from all topics (mixed exam)
        [qs] = await conn.execute(
          `SELECT id FROM questions WHERE status=? ORDER BY RAND() LIMIT ${totalQuestionsNum}`,
          ['active']
        );
      }
      
      // Link questions to exam
      for (let i = 0; i < qs.length; i++) {
        await conn.execute(
          'INSERT INTO exam_questions (exam_id,question_id,order_no) VALUES (?,?,?)',
          [id, qs[i].id, i + 1]
        );
      }
      
      // Log activity
      await conn.execute(
        'INSERT INTO activity_logs (user_id,action,entity,entity_id) VALUES (?,?,?,?)',
        [req.user.id, 'CREATE_EXAM', 'exams', id]
      );
    }
  });

  return created(res, { id }, 'Exam created successfully');
});

exports.updateExam = asyncHandler(async (req, res) => {
  const { title, description, duration_minutes, pass_percentage, negative_marking, is_published } = req.body;
  await query(
    'UPDATE exams SET title=COALESCE(?,title), description=COALESCE(?,description), duration_minutes=COALESCE(?,duration_minutes), pass_percentage=COALESCE(?,pass_percentage), negative_marking=COALESCE(?,negative_marking), is_published=COALESCE(?,is_published), updated_at=NOW() WHERE id=?',
    [title, description, duration_minutes, pass_percentage, negative_marking, is_published, req.params.id]
  );
  return success(res, {}, 'Exam updated');
});

exports.deleteExam = asyncHandler(async (req, res) => {
  await query('DELETE FROM exams WHERE id=?', [req.params.id]);
  return success(res, {}, 'Exam deleted');
});

exports.publishExam = asyncHandler(async (req, res) => {
  await query('UPDATE exams SET is_published=TRUE WHERE id=?', [req.params.id]);
  return success(res, {}, 'Exam published');
});

// ── Helper ────────────────────────────────────────────────────────────────────
async function getExamQuestions(examId, attemptId) {
  return query(
    `SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
     aa.selected_ans, aa.is_marked
     FROM questions q
     JOIN exam_questions eq ON q.id=eq.question_id
     LEFT JOIN attempt_answers aa ON aa.question_id=q.id AND aa.attempt_id=?
     WHERE eq.exam_id=?`,
    [attemptId, examId]
  );
}

// ── Get exam questions (for admin management) ────────────────────────────────
exports.getExamQuestions = asyncHandler(async (req, res) => {
  const questions = await query(
    `SELECT q.*, eq.order_no, t.name AS topic_name
     FROM questions q
     JOIN exam_questions eq ON q.id=eq.question_id
     LEFT JOIN topics t ON q.topic_id=t.id
     WHERE eq.exam_id=?
     ORDER BY eq.order_no`,
    [req.params.id]
  );
  return success(res, questions);
});

// ── Add question to exam ──────────────────────────────────────────────────────
exports.addQuestionToExam = asyncHandler(async (req, res) => {
  const { question_id } = req.body;
  const examId = req.params.id;
  
  // Check if question already exists in exam
  const existing = await query(
    'SELECT exam_id FROM exam_questions WHERE exam_id=? AND question_id=?',
    [examId, question_id]
  );
  if (existing.length) return error(res, 'Question already in exam', 409);
  
  // Get next order number
  const result = await query(
    'SELECT COALESCE(MAX(order_no), 0) AS max_order FROM exam_questions WHERE exam_id=?',
    [examId]
  );
  const max_order = result[0]?.max_order || 0;
  
  await query(
    'INSERT INTO exam_questions (exam_id, question_id, order_no) VALUES (?,?,?)',
    [examId, question_id, max_order + 1]
  );
  
  // Update total_questions count
  await query(
    'UPDATE exams SET total_questions=(SELECT COUNT(*) FROM exam_questions WHERE exam_id=?) WHERE id=?',
    [examId, examId]
  );
  
  return created(res, {}, 'Question added to exam');
});

// ── Remove question from exam ─────────────────────────────────────────────────
exports.removeQuestionFromExam = asyncHandler(async (req, res) => {
  const { id: examId, questionId } = req.params;
  
  await query(
    'DELETE FROM exam_questions WHERE exam_id=? AND question_id=?',
    [examId, questionId]
  );
  
  // Update total_questions count
  await query(
    'UPDATE exams SET total_questions=(SELECT COUNT(*) FROM exam_questions WHERE exam_id=?) WHERE id=?',
    [examId, examId]
  );
  
  return success(res, {}, 'Question removed from exam');
});
