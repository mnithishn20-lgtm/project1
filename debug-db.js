import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'quiz_app'
  });

  try {
    const [tables] = await conn.query('SHOW TABLES LIKE "profiles"');
    console.log('profiles table rows:', JSON.stringify(tables));
    const [result] = await conn.execute(
      'INSERT INTO profiles (name, email, phone, education, experience, domain_interest) VALUES (?, ?, ?, ?, ?, ?)',
      ['Test', 'test@example.com', '', 'Undergraduate', 'Beginner', 'Programming']
    );
    console.log('insert result:', JSON.stringify(result));
  } finally {
    await conn.end();
  }
})();
