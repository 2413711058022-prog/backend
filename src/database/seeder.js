require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'govexam',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  console.log('Seeding database...');
  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  await conn.query(seed);
  console.log('✅ Seed data inserted (200 questions + sample exams)');
  await conn.end();
}

seed().catch(err => { console.error('Seeding failed:', err); process.exit(1); });
