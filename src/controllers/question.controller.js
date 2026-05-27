const { query } = require('../config/database');
const { success, created, paginated, error } = require('../utils/response.utils');
const { asyncHandler } = require('../middleware/error.middleware');
const XLSX = require('xlsx');
const fs = require('fs');

// ── List questions ────────────────────────────────────────────────────────────
exports.listQuestions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, topic_id, difficulty_level, search, status = 'active', exam_id } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;
  const params = [];
  let where = 'WHERE 1=1';
  let joins = 'LEFT JOIN topics t ON q.topic_id=t.id';

  if (exam_id) {
    joins += ' INNER JOIN exam_questions eq ON q.id=eq.question_id';
    where += ' AND eq.exam_id=?';
    params.push(exam_id);
  }

  if (topic_id) { where += ' AND q.topic_id=?'; params.push(topic_id); }
  if (difficulty_level !== undefined) { where += ' AND q.difficulty_level=?'; params.push(difficulty_level); }
  if (status) { where += ' AND q.status=?'; params.push(status); }
  if (search) { where += ' AND q.question_text LIKE ?'; params.push(`%${search}%`); }

  const sql = `SELECT q.*, t.name AS topic_name FROM questions q ${joins} ${where} ORDER BY q.id LIMIT ${limitNum} OFFSET ${offset}`;
  
  const rows = await query(sql, params);
  
  const countJoins = exam_id ? 'INNER JOIN exam_questions eq ON q.id=eq.question_id' : '';
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM questions q ${countJoins} ${where}`, params);
  return paginated(res, rows, total, pageNum, limitNum);
});

// ── List topics ───────────────────────────────────────────────────────────────
exports.listTopics = asyncHandler(async (req, res) => {
  const topics = await query(
    'SELECT t.*, COUNT(q.id) AS question_count FROM topics t LEFT JOIN questions q ON q.topic_id=t.id GROUP BY t.id ORDER BY t.name'
  );
  return success(res, topics);
});

// ── Get single question ───────────────────────────────────────────────────────
exports.getQuestion = asyncHandler(async (req, res) => {
  const rows = await query(
    'SELECT q.*, t.name AS topic_name FROM questions q LEFT JOIN topics t ON q.topic_id=t.id WHERE q.id=?',
    [req.params.id]
  );
  if (!rows.length) return error(res, 'Question not found', 404);
  return success(res, rows[0]);
});

// ── Create question ───────────────────────────────────────────────────────────
exports.createQuestion = asyncHandler(async (req, res) => {
  console.log('Creating question with body:', req.body);
  const { topic_id, question_text, option_a, option_b, option_c, option_d,
    correct_answer, explanation, difficulty_level, source } = req.body;

  const result = await query(
    'INSERT INTO questions (topic_id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,difficulty_level,source) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [topic_id, question_text, option_a, option_b, option_c, option_d,
     correct_answer, explanation || null, difficulty_level || 0, source || null]
  );
  console.log('Question created with ID:', result.insertId);
  return created(res, { id: result.insertId }, 'Question created');
});

// ── Update question ───────────────────────────────────────────────────────────
exports.updateQuestion = asyncHandler(async (req, res) => {
  const { question_text, option_a, option_b, option_c, option_d,
    correct_answer, explanation, difficulty_level, status } = req.body;
  await query(
    `UPDATE questions SET
      question_text=COALESCE(?,question_text),
      option_a=COALESCE(?,option_a), option_b=COALESCE(?,option_b),
      option_c=COALESCE(?,option_c), option_d=COALESCE(?,option_d),
      correct_answer=COALESCE(?,correct_answer),
      explanation=COALESCE(?,explanation),
      difficulty_level=COALESCE(?,difficulty_level),
      status=COALESCE(?,status)
    WHERE id=?`,
    [question_text, option_a, option_b, option_c, option_d,
     correct_answer, explanation, difficulty_level, status, req.params.id]
  );
  return success(res, {}, 'Question updated');
});

// ── Delete question ───────────────────────────────────────────────────────────
exports.deleteQuestion = asyncHandler(async (req, res) => {
  await query('UPDATE questions SET status=? WHERE id=?', ['inactive', req.params.id]);
  return success(res, {}, 'Question deactivated');
});

// ── Import from Excel ─────────────────────────────────────────────────────────
exports.importFromExcel = asyncHandler(async (req, res) => {
  if (!req.file) return error(res, 'No file uploaded', 400);

  const workbook = XLSX.readFile(req.file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    try {
      // Find or create topic
      let topicId = null;
      if (row.topic) {
        const topics = await query('SELECT id FROM topics WHERE name=?', [row.topic]);
        if (topics.length) {
          topicId = topics[0].id;
        } else {
          const slug = row.topic.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const [t] = await query('INSERT INTO topics (name,slug) VALUES (?,?)', [row.topic, slug]);
          topicId = t.insertId;
        }
      }

      await query(
        'INSERT INTO questions (topic_id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,difficulty_level,source) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [topicId, row.question, row.option_a, row.option_b, row.option_c, row.option_d,
         row.answer, row.tips || null, row.difficulty_level || 0, row.source || null]
      );
      imported++;
    } catch (e) {
      skipped++;
    }
  }

  fs.unlinkSync(req.file.path);
  return success(res, { imported, skipped }, `Imported ${imported} questions, skipped ${skipped}`);
});
