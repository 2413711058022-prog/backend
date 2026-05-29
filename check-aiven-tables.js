const mysql = require('mysql2/promise');

const aivenConfig = {
  host: 'mysql-1d7de91b-sxax9009-0bba.h.aivencloud.com',
  port: 14455,
  user: 'avnadmin',
  password: 'AVNS_itg1urgrJU0RHkEOQwY',
  database: 'defaultdb',
  ssl: {
    rejectUnauthorized: false
  }
};

async function checkTables() {
  try {
    const connection = await mysql.createConnection(aivenConfig);
    console.log('✅ Connected to Aiven');

    const [tables] = await connection.query('SHOW TABLES');
    console.log('\n📋 Tables in database:');
    console.log(tables);

    if (tables.length === 0) {
      console.log('\n❌ No tables found! Need to run schema creation.');
    } else {
      console.log(`\n✅ Found ${tables.length} tables`);
      
      // Check users table specifically
      try {
        const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
        console.log(`✅ Users table exists with ${users[0].count} records`);
      } catch (err) {
        console.log('❌ Users table error:', err.message);
      }
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTables();
