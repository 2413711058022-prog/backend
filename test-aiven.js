const mysql = require('mysql2/promise');

const config = {
  host: 'mysql-1d7de91b-sxsa9009-0bba.h.aivencloud.com',
  port: 14455,
  user: 'avnadmin',
  password: 'AVNS_itg1urgrJU0RHkEOQwY',
  database: 'defaultdb',
  ssl: {
    rejectUnauthorized: false
  }
};

async function test() {
  console.log('Testing connection...');
  console.log('Host:', config.host);
  
  try {
    const conn = await mysql.createConnection(config);
    console.log('✅ Connected!');
    
    const [result] = await conn.query('SELECT 1 as test');
    console.log('✅ Query works!', result);
    
    await conn.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

test();
