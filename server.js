import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

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

let databaseReady = false;
let databaseError = null;

function getDatabaseErrorMessage() {
  if (!databaseError) return null;
  return databaseError instanceof Error ? databaseError.message : String(databaseError);
}

function requireDatabase(_req, res, next) {
  if (databaseReady) {
    next();
    return;
  }

  res.status(503).json({
    error: 'Database unavailable',
    detail: getDatabaseErrorMessage() || 'Database initialization has not completed yet.',
  });
}


async function ensureProfileAuthColumns(admin) {
  const [columns] = await admin.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'password_hash'`,
    [dbConfig.database]
  );
  if (columns.length === 0) {
    await admin.query('ALTER TABLE profiles ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL AFTER email');
  }

  const [indexes] = await admin.execute(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'profiles' AND INDEX_NAME = 'uq_profiles_email'`,
    [dbConfig.database]
  );
  if (indexes.length === 0) {
    await admin.query('ALTER TABLE profiles ADD UNIQUE KEY uq_profiles_email (email)');
  }
}

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
        password_hash VARCHAR(255) DEFAULT NULL,
        phone VARCHAR(50) DEFAULT NULL,
        education VARCHAR(100) DEFAULT NULL,
        experience VARCHAR(100) DEFAULT NULL,
        domain_interest VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_profiles_email (email)
      )
    `);

    await ensureProfileAuthColumns(admin);

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

  } finally {
    await admin.end();
  }
}


function isDuplicateKeyError(err) {
  if (!err || typeof err !== 'object') return false;

  const code = typeof err.code === 'string' ? err.code : '';
  const errno = Number(err.errno ?? NaN);
  const message = typeof err.message === 'string' ? err.message : '';
  const sqlMessage = typeof err.sqlMessage === 'string' ? err.sqlMessage : '';

  return (
    code === 'ER_DUP_ENTRY' ||
    errno === 1062 ||
    /duplicate entry/i.test(message) ||
    /duplicate entry/i.test(sqlMessage)
  );
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, key] = String(storedHash || '').split(':');
  if (!salt || !key) return false;
  const expected = Buffer.from(key, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function validateAuthPayload(payload) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || '');

  if (!email) return { error: 'Please enter your Gmail ID.' };
  if (!/^[^\s@]+@gmail\.com$/i.test(email)) return { error: 'Please enter a valid Gmail ID.' };
  if (!password) return { error: 'Please enter your password.' };
  if (password.length < 6) return { error: 'Password must be at least 6 characters.' };

  return { email, password };
}

app.get('/health', (_req, res) => res.json({
  ok: true,
  database: databaseReady ? 'ready' : 'unavailable',
  ...(databaseReady ? {} : { detail: getDatabaseErrorMessage() }),
}));

app.use(requireDatabase);

app.post('/profiles', async (req, res) => {
  try {
    console.log('Profile request body:', { ...req.body, password: req.body?.password ? '[redacted]' : undefined });
    const payload = req.body || {};
    const auth = validateAuthPayload(payload);
    if (auth.error) {
      res.status(400).json({ error: auth.error });
      return;
    }

    const [existing] = await pool.execute('SELECT id FROM profiles WHERE email = ? LIMIT 1', [auth.email]);
    if (existing.length > 0) {
      res.status(409).json({ error: 'Already registered with this Gmail ID. Please login instead.' });
      return;
    }

    const [result] = await pool.execute(
      'INSERT INTO profiles (name, email, password_hash, phone, education, experience, domain_interest) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [payload.name, auth.email, hashPassword(auth.password), payload.phone || null, payload.education, payload.experience, payload.domain_interest]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    console.error('Profile insert failed:', err);
    const duplicate = isDuplicateKeyError(err);

    if (duplicate) {
      res.status(409).json({
        error: 'Already registered with this Gmail ID. Please login instead.',
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to create profile',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

app.post('/login', async (req, res) => {
  try {
    const auth = validateAuthPayload(req.body || {});
    if (auth.error) {
      res.status(400).json({ error: auth.error });
      return;
    }

    const [rows] = await pool.execute('SELECT id, password_hash FROM profiles WHERE email = ? LIMIT 1', [auth.email]);
    const user = rows[0];
    if (!user || !verifyPassword(auth.password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid Gmail ID or password.' });
      return;
    }

    res.json({ id: user.id });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'Failed to login', detail: err instanceof Error ? err.message : String(err) });
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

app.get('/questions/domain/:domain/fresh', async (req, res) => {
  try {
    const profileId = String(req.query.profileId || '').trim();
    const date = String(req.query.date || '').trim();
    const requestedLimit = Number(req.query.limit || 20);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(Math.floor(requestedLimit), 100))
      : 20;

    if (!profileId || !date) {
      res.status(400).json({ error: 'Missing required query parameters: profileId and date' });
      return;
    }

    const [rows] = await pool.execute(
      `SELECT q.*
       FROM questions q
       WHERE q.domain = ?
         AND NOT EXISTS (
           SELECT 1
           FROM quiz_attempts qa
           WHERE qa.question_id = q.id
             AND qa.profile_id = ?
             AND DATE(qa.attempted_at) = ?
         )
       ORDER BY RAND()
       LIMIT ${limit}`,
      [req.params.domain, profileId, date]
    );

    res.json(rows);
  } catch (err) {
    console.error('Fresh domain question fetch failed:', err);
    res.status(500).json({ error: 'Failed to load fresh questions', detail: err instanceof Error ? err.message : String(err) });
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


app.get('/daily-progress/:profileId', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM daily_progress WHERE profile_id = ? ORDER BY date DESC',
      [req.params.profileId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Daily progress fetch failed:', err);
    res.status(500).json({ error: 'Failed to load daily progress', detail: err instanceof Error ? err.message : String(err) });
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

const port = Number(process.env.PORT || 3001);

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);

  initializeDatabase()
    .then(() => {
      databaseReady = true;
      databaseError = null;
      console.log('Database initialized successfully.');
    })
    .catch((err) => {
      databaseReady = false;
      databaseError = err;
      console.error('Database initialization failed; API routes will return 503 until MySQL is available:', err);
    });
});
