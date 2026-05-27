require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function fixExamQuestions() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'govexam',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  console.log('Fixing exam questions...');

  // Clear existing exam_questions
  await conn.query('DELETE FROM exam_questions');
  console.log('✅ Cleared existing exam_questions');

  // Exam 1: PC Hardware (topic 1, 10 questions)
  const [q1] = await conn.query('SELECT id FROM questions WHERE topic_id=1 AND status="active" ORDER BY RAND() LIMIT 10');
  for (let i = 0; i < q1.length; i++) {
    await conn.query('INSERT INTO exam_questions (exam_id, question_id, order_no) VALUES (?,?,?)', 
      ['exam-0001-0000-0000-000000000001', q1[i].id, i + 1]);
  }
  console.log(`✅ Linked ${q1.length} questions to PC Hardware exam`);

  // Exam 2: LAN Networking (topic 2, 15 questions)
  const [q2] = await conn.query('SELECT id FROM questions WHERE topic_id=2 AND status="active" ORDER BY RAND() LIMIT 15');
  for (let i = 0; i < q2.length; i++) {
    await conn.query('INSERT INTO exam_questions (exam_id, question_id, order_no) VALUES (?,?,?)', 
      ['exam-0002-0000-0000-000000000002', q2[i].id, i + 1]);
  }
  console.log(`✅ Linked ${q2.length} questions to LAN Networking exam`);

  // Exam 3: Internet & Email (topic 4, 10 questions)
  const [q3] = await conn.query('SELECT id FROM questions WHERE topic_id=4 AND status="active" ORDER BY RAND() LIMIT 10');
  for (let i = 0; i < q3.length; i++) {
    await conn.query('INSERT INTO exam_questions (exam_id, question_id, order_no) VALUES (?,?,?)', 
      ['exam-0003-0000-0000-000000000003', q3[i].id, i + 1]);
  }
  console.log(`✅ Linked ${q3.length} questions to Internet & Email exam`);

  // Exam 4: Railway Digital (topic 5, 20 questions)
  const [q4] = await conn.query('SELECT id FROM questions WHERE topic_id=5 AND status="active" ORDER BY RAND() LIMIT 20');
  for (let i = 0; i < q4.length; i++) {
    await conn.query('INSERT INTO exam_questions (exam_id, question_id, order_no) VALUES (?,?,?)', 
      ['exam-0004-0000-0000-000000000004', q4[i].id, i + 1]);
  }
  console.log(`✅ Linked ${q4.length} questions to Railway Digital exam`);

  // Exam 5: Full Mock Test (all topics, 30 questions)
  const [q5] = await conn.query('SELECT id FROM questions WHERE status="active" ORDER BY RAND() LIMIT 30');
  for (let i = 0; i < q5.length; i++) {
    await conn.query('INSERT INTO exam_questions (exam_id, question_id, order_no) VALUES (?,?,?)', 
      ['exam-0005-0000-0000-000000000005', q5[i].id, i + 1]);
  }
  console.log(`✅ Linked ${q5.length} questions to Full Mock Test`);

  // Verify
  const [result] = await conn.query(`
    SELECT e.title, COUNT(eq.question_id) as count 
    FROM exams e 
    LEFT JOIN exam_questions eq ON e.id = eq.exam_id 
    GROUP BY e.id
  `);
  console.log('\n📊 Final verification:');
  result.forEach(r => console.log(`   ${r.title}: ${r.count} questions`));

  await conn.end();
  console.log('\n✅ All exam questions fixed successfully!');
}

fixExamQuestions().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
