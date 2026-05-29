require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function countQuestions() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'govexam',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  const [[{ totalQuestions }]] = await conn.query('SELECT COUNT(*) AS totalQuestions FROM questions');
  const [[{ activeQuestions }]] = await conn.query('SELECT COUNT(*) AS activeQuestions FROM questions WHERE status="active"');

  console.log('========================================');
  console.log('  QUESTION COUNTS');
  console.log('========================================');
  console.log(`Total Questions: ${totalQuestions}`);
  console.log(`Active Questions: ${activeQuestions}`);
  console.log('');

  console.log('--- By Topic ---');
  const [topics] = await conn.query(
    'SELECT t.name, COUNT(q.id) AS count FROM topics t LEFT JOIN questions q ON t.id = q.topic_id GROUP BY t.id, t.name ORDER BY t.id'
  );
  topics.forEach(t => console.log(`  ${t.name}: ${t.count}`));
  console.log('');

  console.log('--- By Exam ---');
  const [exams] = await conn.query(
    'SELECT e.title, COUNT(eq.question_id) AS count FROM exams e LEFT JOIN exam_questions eq ON e.id = eq.exam_id GROUP BY e.id, e.title'
  );
  exams.forEach(e => console.log(`  ${e.title}: ${e.count}`));

  await conn.end();
}

countQuestions().catch(err => { console.error('Error:', err.message); process.exit(1); });
