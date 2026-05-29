const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Aiven Database Configuration
const aivenConfig = {
  host: 'mysql-1d7de91b-sxax9009-0bba.h.aivencloud.com',
  port: 14455,
  user: 'avnadmin',
  password: 'AVNS_itg1urgrJU0RHkEOQwY',
  database: 'defaultdb',
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 30000
};

async function pushToAiven() {
  console.log('🔌 Connecting to Aiven MySQL database...');
  
  try {
    const connection = await mysql.createConnection(aivenConfig);
    console.log('✅ Connected successfully!');

    // Read and execute schema.sql
    console.log('\n📋 Creating tables...');
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'src', 'database', 'schema.sql'),
      'utf8'
    );
    
    const schemaStatements = schemaSQL
      .split(';')
      .filter(stmt => stmt.trim().length > 0);
    
    for (const statement of schemaStatements) {
      try {
        await connection.query(statement);
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.log('⚠️  Warning:', err.message.substring(0, 100));
        }
      }
    }
    console.log('✅ Tables created successfully!');

    // Read and execute seed.sql
    console.log('\n🌱 Loading sample data...');
    const seedSQL = fs.readFileSync(
      path.join(__dirname, 'src', 'database', 'seed.sql'),
      'utf8'
    );
    
    const seedStatements = seedSQL
      .split(';')
      .filter(stmt => stmt.trim().length > 0);
    
    for (const statement of seedStatements) {
      if (statement.trim()) {
        try {
          await connection.query(statement);
        } catch (err) {
          if (!err.message.includes('Duplicate entry')) {
            console.log('⚠️  Warning:', err.message.substring(0, 100));
          }
        }
      }
    }
    console.log('✅ Sample data loaded successfully!');

    // Verify data
    console.log('\n🔍 Verifying data...');
    const [questions] = await connection.query('SELECT COUNT(*) as count FROM questions');
    const [exams] = await connection.query('SELECT COUNT(*) as count FROM exams');
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    
    console.log(`✅ Questions: ${questions[0].count}`);
    console.log(`✅ Exams: ${exams[0].count}`);
    console.log(`✅ Users: ${users[0].count}`);

    await connection.end();
    console.log('\n🎉 Database migration complete!');
    console.log('\n📝 Your Aiven database is ready!');
    console.log('   Host:', aivenConfig.host);
    console.log('   Port:', aivenConfig.port);
    console.log('   Database:', aivenConfig.database);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check if Aiven database is running');
    console.error('   2. Verify IP access is set to 0.0.0.0/0');
    console.error('   3. Confirm database credentials are correct');
    process.exit(1);
  }
}

pushToAiven();
