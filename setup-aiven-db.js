const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Aiven Database Configuration
const config = {
  host: 'mysql-46bba74-mopvaishnav-ce41.h.aivencloud.com',
  port: 20958,
  user: 'avnadmin',
  password: 'AVNR_wc7x1c1wGin-MHVdkr7',
  database: 'defaultdb',
  ssl: {
    rejectUnauthorized: true
  },
  connectTimeout: 30000
};

async function setupDatabase() {
  console.log('🔌 Connecting to Aiven MySQL database...');
  
  try {
    const connection = await mysql.createConnection(config);
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
      await connection.query(statement);
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
        await connection.query(statement);
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
    console.log('\n🎉 Database setup complete!');
    console.log('\n📝 Your database is ready to use!');
    console.log('   Host:', config.host);
    console.log('   Port:', config.port);
    console.log('   Database:', config.database);
    console.log('   User:', config.user);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupDatabase();
