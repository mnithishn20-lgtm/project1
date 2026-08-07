import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'node:url';

dotenv.config({
  path: fileURLToPath(new URL('.env', import.meta.url)),
  override: true,
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use((req, _res, next) => {
  console.log('Incoming', req.method, req.path);
  next();
});

const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'quiz_app',
  connectTimeout: 10000,
};

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function initializeDatabase() {
  const admin = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    connectTimeout: 10000,
  });

  try {
    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    await admin.query(`USE \`${dbConfig.database}\``);

    await admin.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) DEFAULT NULL,
        education VARCHAR(100) DEFAULT NULL,
        experience VARCHAR(100) DEFAULT NULL,
        domain_interest VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await admin.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        domain VARCHAR(100) NOT NULL,
        question TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_answer CHAR(1) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await admin.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        profile_id INT NOT NULL,
        question_id INT NOT NULL,
        selected_answer VARCHAR(10) NOT NULL,
        is_correct TINYINT(1) NOT NULL,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        time_taken_ms INT DEFAULT NULL,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      )
    `);

    await admin.query(`
      CREATE TABLE IF NOT EXISTS daily_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        profile_id INT NOT NULL,
        date DATE NOT NULL,
        questions_answered INT NOT NULL DEFAULT 0,
        correct_count INT NOT NULL DEFAULT 0,
        marks INT NOT NULL DEFAULT 0,
        total_time_ms BIGINT NOT NULL DEFAULT 0,
        UNIQUE KEY uq_profile_date (profile_id, date),
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      )
    `);

    await admin.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        profile_id INT PRIMARY KEY,
        total_marks INT NOT NULL DEFAULT 0,
        current_streak INT NOT NULL DEFAULT 0,
        longest_streak INT NOT NULL DEFAULT 0,
        last_active_date DATE DEFAULT NULL,
        total_answered INT NOT NULL DEFAULT 0,
        total_correct INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_time_ms BIGINT NOT NULL DEFAULT 0,
        fastest_correct_ms INT DEFAULT NULL,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      )
    `);

    const [questionCountRows] = await admin.query('SELECT COUNT(*) AS count FROM questions');
    const questionCount = Number(questionCountRows[0]?.count ?? 0);

    if (questionCount === 0) {
      await admin.query(`
        INSERT INTO questions (domain, question, option_a, option_b, option_c, option_d, correct_answer) VALUES
        ('Programming', 'Which keyword is used to define a constant in JavaScript?', 'var', 'let', 'const', 'static', 'C'),
        ('Programming', 'What does OOP stand for?', 'Object Oriented Programming', 'Open Output Protocol', 'Online Operation Process', 'Ordered Object Pattern', 'A'),
        ('Networking', 'Which port is used by HTTPS by default?', '80', '21', '443', '8080', 'C'),
        ('Networking', 'Which protocol is connectionless?', 'TCP', 'UDP', 'HTTP', 'FTP', 'B'),
        ('Databases', 'What does SQL stand for?', 'Simple Query Language', 'Structured Query Language', 'Standard Query Logic', 'Sequential Query Language', 'B'),
        ('Databases', 'Which clause filters rows in SQL?', 'ORDER BY', 'GROUP BY', 'WHERE', 'HAVING', 'C'),
        ('Web Development', 'What does HTML stand for?', 'Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyperlink Text Management', 'A'),
        ('Web Development', 'Which React hook is used for state management?', 'useEffect', 'useState', 'useRef', 'useMemo', 'B'),
        ('Cybersecurity', 'What does VPN stand for?', 'Virtual Private Network', 'Verified Public Node', 'Visual Process Network', 'Virtual Process Node', 'A'),
        ('Cybersecurity', 'Which attack tricks users into revealing credentials?', 'DDoS', 'Phishing', 'SQL Injection', 'Brute Force', 'B')
      `);
    }
  } finally {
    await admin.end();
  }
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/profiles', async (req, res) => {
  try {
    console.log('Profile request body:', req.body);
    const payload = req.body || {};
    const [result] = await pool.execute(
      'INSERT INTO profiles (name, email, phone, education, experience, domain_interest) VALUES (?, ?, ?, ?, ?, ?)',
      [payload.name, payload.email, payload.phone || null, payload.education, payload.experience, payload.domain_interest]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    console.error('Profile insert failed:', err);
    res.status(500).json({ error: 'Failed to create profile', detail: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/profiles/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM profiles WHERE id = ?', [req.params.id]);
    res.json(rows[0] || null);
  } catch (err) {
    console.error('Profile fetch failed:', err);
    res.status(500).json({ error: 'Failed to load profile', detail: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/questions', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM questions');
    res.json(rows);
  } catch (err) {
    console.error('Question fetch failed:', err);
    res.status(500).json({ error: 'Failed to load questions', detail: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/questions/domain/:domain', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM questions WHERE domain = ?', [req.params.domain]);
    res.json(rows);
  } catch (err) {
    console.error('Domain question fetch failed:', err);
    res.status(500).json({ error: 'Failed to load questions', detail: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/quiz-attempts', async (req, res) => {
  try {
    const { profile_id, question_id, selected_answer, is_correct, time_taken_ms } = req.body;
    await pool.execute(
      'INSERT INTO quiz_attempts (profile_id, question_id, selected_answer, is_correct, time_taken_ms) VALUES (?, ?, ?, ?, ?)',
      [profile_id, question_id, selected_answer, is_correct ? 1 : 0, time_taken_ms]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Attempt save failed:', err);
    res.status(500).json({ error: 'Failed to save attempt', detail: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/daily-progress', async (req, res) => {
  try {
    const { profile_id, date, questions_answered, correct_count, marks, total_time_ms } = req.body;
    await pool.execute(
      'INSERT INTO daily_progress (profile_id, date, questions_answered, correct_count, marks, total_time_ms) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE questions_answered = questions_answered + ?, correct_count = correct_count + ?, marks = marks + ?, total_time_ms = total_time_ms + ?',
      [profile_id, date, questions_answered, correct_count, marks, total_time_ms, questions_answered, correct_count, marks, total_time_ms]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Daily progress save failed:', err);
    res.status(500).json({ error: 'Failed to save daily progress', detail: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/user-stats/:profileId', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM user_stats WHERE profile_id = ?', [req.params.profileId]);
    res.json(rows[0] || null);
  } catch (err) {
    console.error('Stats fetch failed:', err);
    res.status(500).json({ error: 'Failed to load stats', detail: err instanceof Error ? err.message : String(err) });
  }
});

app.put('/user-stats/:profileId', async (req, res) => {
  try {
    const { profile_id, total_answered, total_correct, total_marks, current_streak, longest_streak, last_active_date, total_time_ms, fastest_correct_ms } = req.body;
    await pool.execute(
      'INSERT INTO user_stats (profile_id, total_answered, total_correct, total_marks, current_streak, longest_streak, last_active_date, total_time_ms, fastest_correct_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_answered = ?, total_correct = ?, total_marks = ?, current_streak = ?, longest_streak = ?, last_active_date = ?, total_time_ms = ?, fastest_correct_ms = ?',
      [profile_id, total_answered, total_correct, total_marks, current_streak, longest_streak, last_active_date, total_time_ms, fastest_correct_ms, total_answered, total_correct, total_marks, current_streak, longest_streak, last_active_date, total_time_ms, fastest_correct_ms]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Stats update failed:', err);
    res.status(500).json({ error: 'Failed to update stats', detail: err instanceof Error ? err.message : String(err) });
  }
});

initializeDatabase()
  .then(() => {
    app.listen(3001, () => {
      console.log('MySQL backend listening on http://localhost:3001');
    });
  })
  .catch((err) => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });
