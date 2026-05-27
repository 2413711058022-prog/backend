const bcrypt = require('bcryptjs');

async function generateHashes() {
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const studentHash = await bcrypt.hash('Student@123', 12);
  
  console.log('Admin@123 hash:', adminHash);
  console.log('Student@123 hash:', studentHash);
}

generateHashes();
