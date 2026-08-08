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

const QUESTION_BANK = {
  'Programming': [
    { question: 'Which data structure uses FIFO ordering?', option_a: 'Stack', option_b: 'Queue', option_c: 'Tree', option_d: 'Heap', correct_answer: 'B' },
    { question: 'Which keyword declares a block-scoped variable in JavaScript?', option_a: 'var', option_b: 'let', option_c: 'function', option_d: 'class', correct_answer: 'B' },
    { question: 'Which language feature allows a function to access variables from its outer scope?', option_a: 'Compilation', option_b: 'Closure', option_c: 'Indexing', option_d: 'Mutation', correct_answer: 'B' },
    { question: 'What does OOP stand for?', option_a: 'Object Oriented Programming', option_b: 'Online Output Process', option_c: 'Ordered Object Pattern', option_d: 'Open Operation Procedure', correct_answer: 'A' },
    { question: 'Which search algorithm repeatedly halves the search range?', option_a: 'Linear search', option_b: 'Binary search', option_c: 'Bubble sort', option_d: 'Depth-first search', correct_answer: 'B' },
    { question: 'Which command is used to commit saved git changes?', option_a: 'git push', option_b: 'git commit', option_c: 'git clone', option_d: 'git fetch', correct_answer: 'B' },
    { question: 'What is recursion?', option_a: 'A function calling itself', option_b: 'A CSS rule', option_c: 'A SQL update', option_d: 'A database index', correct_answer: 'A' },
    { question: 'Which of these is a statically typed language?', option_a: 'Python', option_b: 'JavaScript', option_c: 'Java', option_d: 'Ruby', correct_answer: 'C' },
    { question: 'Which operator in JavaScript checks both type and value equality?', option_a: '==', option_b: '===', option_c: '=', option_d: '!=', correct_answer: 'B' },
    { question: 'What does API stand for?', option_a: 'Application Programming Interface', option_b: 'Array Process Instruction', option_c: 'Applied Protocol Index', option_d: 'Automatic Program Integration', correct_answer: 'A' },
    { question: 'Which of the following is a high-level language?', option_a: 'Assembly', option_b: 'C', option_c: 'Python', option_d: 'Machine code', correct_answer: 'C' },
    { question: 'Which programming concept hides internal implementation details?', option_a: 'Encapsulation', option_b: 'Iteration', option_c: 'Parsing', option_d: 'Recursion', correct_answer: 'A' },
    { question: 'Which data structure follows Last In First Out?', option_a: 'Queue', option_b: 'Set', option_c: 'Stack', option_d: 'Graph', correct_answer: 'C' },
    { question: 'Which HTML element is commonly used to create a button?', option_a: '<button>', option_b: '<link>', option_c: '<input>', option_d: '<table>', correct_answer: 'A' },
    { question: 'Which step in the software lifecycle usually comes after coding?', option_a: 'Design', option_b: 'Testing', option_c: 'Deployment', option_d: 'Maintenance', correct_answer: 'B' },
    { question: 'Which collection stores unique values?', option_a: 'Array', option_b: 'Set', option_c: 'Map', option_d: 'Object', correct_answer: 'B' },
    { question: 'Which symbol is used for a single-line comment in JavaScript?', option_a: '#', option_b: '//', option_c: '--', option_d: '/* */', correct_answer: 'B' },
    { question: 'Which of these is a framework?', option_a: 'React', option_b: 'MySQL', option_c: 'Linux', option_d: 'HTTP', correct_answer: 'A' },
    { question: 'Which code structure repeats until a condition is false?', option_a: 'Loop', option_b: 'Array', option_c: 'Object', option_d: 'Function', correct_answer: 'A' },
    { question: 'Which data format is commonly used for web APIs?', option_a: 'XML', option_b: 'JSON', option_c: 'CSV', option_d: 'YAML', correct_answer: 'B' }
  ],
  'Networking': [
    { question: 'What does IP stand for?', option_a: 'Internal Path', option_b: 'Internet Protocol', option_c: 'Instruction Pointer', option_d: 'Interchange Packet', correct_answer: 'B' },
    { question: 'Which protocol is connection-oriented?', option_a: 'UDP', option_b: 'TCP', option_c: 'ICMP', option_d: 'ARP', correct_answer: 'B' },
    { question: 'What is the default port for HTTPS?', option_a: '21', option_b: '25', option_c: '80', option_d: '443', correct_answer: 'D' },
    { question: 'Which layer of the OSI model handles routing?', option_a: 'Data Link', option_b: 'Network', option_c: 'Transport', option_d: 'Session', correct_answer: 'B' },
    { question: 'Which device connects networks and routes traffic?', option_a: 'Router', option_b: 'Switch', option_c: 'Hub', option_d: 'Repeater', correct_answer: 'A' },
    { question: 'Which protocol resolves domain names to IP addresses?', option_a: 'DNS', option_b: 'DHCP', option_c: 'FTP', option_d: 'SMTP', correct_answer: 'A' },
    { question: 'What does DHCP do?', option_a: 'Routes web traffic', option_b: 'Assigns IP addresses dynamically', option_c: 'Encrypts files', option_d: 'Runs databases', correct_answer: 'B' },
    { question: 'Which protocol is used for sending mail?', option_a: 'SMTP', option_b: 'HTTP', option_c: 'POP3', option_d: 'SSH', correct_answer: 'A' },
    { question: 'What is a MAC address?', option_a: 'A network interface identifier', option_b: 'A website domain', option_c: 'A file storage path', option_d: 'A routing table', correct_answer: 'A' },
    { question: 'Which network topology connects all devices to one central cable?', option_a: 'Star', option_b: 'Bus', option_c: 'Mesh', option_d: 'Ring', correct_answer: 'B' },
    { question: 'Which OSI layer deals with cables and electrical signaling?', option_a: 'Presentation', option_b: 'Physical', option_c: 'Application', option_d: 'Transport', correct_answer: 'B' },
    { question: 'What does NAT stand for?', option_a: 'Network Access Token', option_b: 'Node Application Table', option_c: 'Network Address Translation', option_d: 'Normal Access Technique', correct_answer: 'C' },
    { question: 'Which protocol is used for secure remote shell access?', option_a: 'FTP', option_b: 'SSH', option_c: 'SMTP', option_d: 'HTTP', correct_answer: 'B' },
    { question: 'Which address is 32 bits long?', option_a: 'IPv6', option_b: 'IPv4', option_c: 'MAC', option_d: 'Subnet mask', correct_answer: 'B' },
    { question: 'Which tool tests connectivity to a host?', option_a: 'ping', option_b: 'ls', option_c: 'grep', option_d: 'tail', correct_answer: 'A' },
    { question: 'Which of these is a private IP range?', option_a: '172.16.0.0/12', option_b: '8.8.8.8', option_c: '1.1.1.1', option_d: '198.51.100.1', correct_answer: 'A' },
    { question: 'What is a LAN?', option_a: 'Local Area Network', option_b: 'Long Access Node', option_c: 'Link Access Number', option_d: 'Logical Application Name', correct_answer: 'A' },
    { question: 'Which type of cable is most common for Ethernet?', option_a: 'Twisted pair', option_b: 'Parallel cable', option_c: 'USB cable', option_d: 'VGA cable', correct_answer: 'A' },
    { question: 'What does a switch primarily do?', option_a: 'Forward packets within a LAN', option_b: 'Display websites', option_c: 'Store passwords', option_d: 'Generate scripts', correct_answer: 'A' },
    { question: 'Which protocol sends data without guaranteeing delivery?', option_a: 'TCP', option_b: 'UDP', option_c: 'TLS', option_d: 'HTTP', correct_answer: 'B' }
  ],
  'Databases': [
    { question: 'What does SQL stand for?', option_a: 'Simple Query Language', option_b: 'Structured Query Language', option_c: 'Sequential Query Logic', option_d: 'Standard Query List', correct_answer: 'B' },
    { question: 'Which key uniquely identifies a row?', option_a: 'Foreign key', option_b: 'Primary key', option_c: 'Index', option_d: 'Column name', correct_answer: 'B' },
    { question: 'Which SQL command returns rows from a table?', option_a: 'UPDATE', option_b: 'DELETE', option_c: 'SELECT', option_d: 'DROP', correct_answer: 'C' },
    { question: 'What is a foreign key?', option_a: 'A key in another table', option_b: 'A local file key', option_c: 'A hashing function', option_d: 'A JSON parser', correct_answer: 'A' },
    { question: 'Which SQL clause filters rows?', option_a: 'WHERE', option_b: 'FROM', option_c: 'JOIN', option_d: 'VALUES', correct_answer: 'A' },
    { question: 'What is normalization?', option_a: 'A way to organize data to reduce redundancy', option_b: 'A type of network', option_c: 'A programming loop', option_d: 'A browser API', correct_answer: 'A' },
    { question: 'Which join returns matching rows from both tables?', option_a: 'INNER JOIN', option_b: 'LEFT JOIN', option_c: 'RIGHT JOIN', option_d: 'FULL JOIN', correct_answer: 'A' },
    { question: 'Which SQL command inserts new records?', option_a: 'INSERT', option_b: 'UPDATE', option_c: 'ALTER', option_d: 'DELETE', correct_answer: 'A' },
    { question: 'What is an index used for?', option_a: 'Speeding up data retrieval', option_b: 'Rendering UI', option_c: 'Authenticating users', option_d: 'DNS routing', correct_answer: 'A' },
    { question: 'Which SQL command removes rows from a table?', option_a: 'DELETE', option_b: 'SELECT', option_c: 'INSERT', option_d: 'COMMIT', correct_answer: 'A' },
    { question: 'What does ACID stand for?', option_a: 'Atomicity, Consistency, Isolation, Durability', option_b: 'Access, Control, Index, Data', option_c: 'Application, Calculation, Index, Data', option_d: 'Access, Columns, Input, Delete', correct_answer: 'A' },
    { question: 'Which operation occurs in a transaction?', option_a: 'A complete atomic unit', option_b: 'A browser render', option_c: 'A network ping', option_d: 'A CSS animation', correct_answer: 'A' },
    { question: 'Which SQL keyword removes duplicates in results?', option_a: 'UNIQUE', option_b: 'DISTINCT', option_c: 'FILTER', option_d: 'INDEX', correct_answer: 'B' },
    { question: 'Which type of database stores rows and columns?', option_a: 'Relational', option_b: 'NoSQL key-value', option_c: 'Graph only', option_d: 'Binary', correct_answer: 'A' },
    { question: 'What does CRUD stand for?', option_a: 'Create, Read, Update, Delete', option_b: 'Code, Run, Upload, Debug', option_c: 'Connect, Route, Upload, Disconnect', option_d: 'Choose, Read, Use, Destroy', correct_answer: 'A' },
    { question: 'Which SQL command changes existing values?', option_a: 'UPDATE', option_b: 'DROP', option_c: 'ALTER', option_d: 'ABOUT', correct_answer: 'A' },
    { question: 'Which transaction command finalizes a transaction?', option_a: 'COMMIT', option_b: 'ROLLBACK', option_c: 'DELETE', option_d: 'MERGE', correct_answer: 'A' },
    { question: 'Which database model is document-based?', option_a: 'MongoDB', option_b: 'MySQL', option_c: 'Oracle', option_d: 'SQLite', correct_answer: 'A' },
    { question: 'Which SQL clause sorts result rows?', option_a: 'WHERE', option_b: 'ORDER BY', option_c: 'SELECT', option_d: 'FROM', correct_answer: 'B' },
    { question: 'What is a view in SQL?', option_a: 'A virtual table derived from a query', option_b: 'A data type', option_c: 'A file extension', option_d: 'A CSS rule', correct_answer: 'A' }
  ],
  'Web Development': [
    { question: 'What does HTML stand for?', option_a: 'HyperText Markup Language', option_b: 'HighText Machine Logic', option_c: 'Home Tool Markup Language', option_d: 'HyperTag Machine List', correct_answer: 'A' },
    { question: 'Which CSS property controls text color?', option_a: 'font-size', option_b: 'color', option_c: 'margin', option_d: 'width', correct_answer: 'B' },
    { question: 'Which tag is used for the largest heading in HTML?', option_a: '<h6>', option_b: '<h1>', option_c: '<p>', option_d: '<div>', correct_answer: 'B' },
    { question: 'What does DOM stand for?', option_a: 'Document Object Model', option_b: 'Data Option Map', option_c: 'Dynamic Object Memory', option_d: 'Document Output Method', correct_answer: 'A' },
    { question: 'Which HTTP method is commonly used to retrieve data?', option_a: 'POST', option_b: 'GET', option_c: 'PUT', option_d: 'DELETE', correct_answer: 'B' },
    { question: 'What is CORS?', option_a: 'Cross-Origin Resource Sharing', option_b: 'Client-Oriented Render System', option_c: 'Canvas Object Rendering Schema', option_d: 'Content Output Routing Structure', correct_answer: 'A' },
    { question: 'Which CSS layout model is two-dimensional?', option_a: 'Flexbox', option_b: 'Grid', option_c: 'Table', option_d: 'Float', correct_answer: 'B' },
    { question: 'What does AJAX allow?', option_a: 'Async page updates', option_b: 'Static file backups', option_c: 'Database locking', option_d: 'Binary storage', correct_answer: 'A' },
    { question: 'Which attribute in HTML marks an input as required?', option_a: 'mandatory', option_b: 'required', option_c: 'checked', option_d: 'hidden', correct_answer: 'B' },
    { question: 'Which React hook manages state?', option_a: 'useState', option_b: 'useFetch', option_c: 'useStorage', option_d: 'useMap', correct_answer: 'A' },
    { question: 'Which CSS unit is relative to the root font size?', option_a: 'em', option_b: 'rem', option_c: 'vh', option_d: 'px', correct_answer: 'B' },
    { question: 'Which tag loads an external JavaScript file?', option_a: '<style>', option_b: '<script>', option_c: '<link>', option_d: '<head>', correct_answer: 'B' },
    { question: 'What does CSS stand for?', option_a: 'Cascading Style Sheets', option_b: 'Creative Style System', option_c: 'Client Side Syntax', option_d: 'Color Styling Script', correct_answer: 'A' },
    { question: 'Which HTTP status code means Not Found?', option_a: '200', option_b: '301', option_c: '404', option_d: '500', correct_answer: 'C' },
    { question: 'What does localStorage provide?', option_a: 'Server-side database access', option_b: 'Persistent browser storage', option_c: 'Network routing', option_d: 'Image optimization', correct_answer: 'B' },
    { question: 'Which React hook is used for side effects?', option_a: 'useState', option_b: 'useEffect', option_c: 'useLayout', option_d: 'useSelector', correct_answer: 'B' },
    { question: 'What does SPA stand for?', option_a: 'Single Page Application', option_b: 'Static Page Architecture', option_c: 'Server Page Access', option_d: 'Shared Program API', correct_answer: 'A' },
    { question: 'Which CSS property adds space inside an element?', option_a: 'padding', option_b: 'border', option_c: 'content', option_d: 'float', correct_answer: 'A' },
    { question: 'Which HTML attribute provides alternate image text?', option_a: 'alt', option_b: 'src', option_c: 'class', option_d: 'href', correct_answer: 'A' },
    { question: 'What is responsive design?', option_a: 'Design that adapts to screen size', option_b: 'A data backup method', option_c: 'A database index', option_d: 'A transport protocol', correct_answer: 'A' }
  ],
  'Cybersecurity': [
    { question: 'What does VPN stand for?', option_a: 'Virtual Private Network', option_b: 'Verified Public Node', option_c: 'Virtual Process Network', option_d: 'Visual Program Network', correct_answer: 'A' },
    { question: 'Which attack tricks users into revealing information?', option_a: 'Phishing', option_b: 'Compression', option_c: 'Caching', option_d: 'Ping sweep', correct_answer: 'A' },
    { question: 'What is encryption?', option_a: 'Converting data into unreadable form', option_b: 'A browser rendering API', option_c: 'A network routing method', option_d: 'A database command', correct_answer: 'A' },
    { question: 'What does MFA stand for?', option_a: 'Multi-Factor Authentication', option_b: 'Main File Access', option_c: 'Managed Firewall Access', option_d: 'Multi-Frequency Algorithm', correct_answer: 'A' },
    { question: 'Which protocol protects secure web traffic?', option_a: 'HTTP', option_b: 'HTTPS', option_c: 'SMTP', option_d: 'FTP', correct_answer: 'B' },
    { question: 'What is a firewall?', option_a: 'A network security control', option_b: 'A CPU cache', option_c: 'A stylesheet', option_d: 'A text editor', correct_answer: 'A' },
    { question: 'Which attack floods a server with traffic?', option_a: 'Phishing', option_b: 'DDoS', option_c: 'Keylogger', option_d: 'Buffering', correct_answer: 'B' },
    { question: 'What is malware?', option_a: 'A harmful software program', option_b: 'An HTML tag', option_c: 'A database schema', option_d: 'A CSS parser', correct_answer: 'A' },
    { question: 'What is hashing used for?', option_a: 'One-way password storage and integrity checks', option_b: 'Creating UI themes', option_c: 'Downloading files', option_d: 'Layout calculations', correct_answer: 'A' },
    { question: 'What is social engineering?', option_a: 'Manipulating users into revealing secrets', option_b: 'Compressing files', option_c: 'Resetting hashes', option_d: 'Encrypting databases', correct_answer: 'A' },
    { question: 'Which security principle limits access to only what is needed?', option_a: 'Least privilege', option_b: 'Full access', option_c: 'Open sharing', option_d: 'Privilege escalation', correct_answer: 'A' },
    { question: 'What is a zero-day vulnerability?', option_a: 'A flaw unknown to vendors or defenders', option_b: 'A daily API update', option_c: 'A browser cache key', option_d: 'A table join', correct_answer: 'A' },
    { question: 'Which method uses repeated guesses to break a password?', option_a: 'Brute force', option_b: 'CSS layering', option_c: 'Variable declaration', option_d: 'Compression', correct_answer: 'A' },
    { question: 'What does XSS stand for?', option_a: 'Cross-Site Scripting', option_b: 'XML Secure Shield', option_c: 'Remote File Storage', option_d: 'Extended Session Service', correct_answer: 'A' },
    { question: 'Which action is safest before clicking an email link?', option_a: 'Verify sender and URL', option_b: 'Send it everywhere', option_c: 'Enter credentials immediately', option_d: 'Disable all security', correct_answer: 'A' },
    { question: 'What is a credential?', option_a: 'A username/password or key used for access', option_b: 'A CSS animation', option_c: 'A package manager', option_d: 'A UI badge', correct_answer: 'A' },
    { question: 'What does TLS provide?', option_a: 'Transport Layer Security for encryption', option_b: 'Database storage', option_c: 'Hardware routing', option_d: 'Browser rendering', correct_answer: 'A' },
    { question: 'Which category of security deals with protecting data while stored?', option_a: 'Data at rest', option_b: 'Packet route', option_c: 'Access plan', option_d: 'Cache layering', correct_answer: 'A' },
    { question: 'What is a password manager used for?', option_a: 'Generating and storing credentials', option_b: 'Editing HTML files', option_c: 'Sending SMS messages', option_d: 'Running SQL queries', correct_answer: 'A' },
    { question: 'What is a certificate in cybersecurity?', option_a: 'A digital identity document for secure communication', option_b: 'A firewall DNS table', option_c: 'A CSS property', option_d: 'A deleted user session', correct_answer: 'A' }
  ]
};

async function ensureQuestionSeeds(admin) {
  const domains = Object.keys(QUESTION_BANK);

  for (const domain of domains) {
    const seedRows = QUESTION_BANK[domain];

    for (const seed of seedRows) {
      const [existing] = await admin.execute(
        'SELECT id FROM questions WHERE domain = ? AND question = ? LIMIT 1',
        [domain, seed.question]
      );

      if (existing.length === 0) {
        await admin.execute(
          'INSERT INTO questions (domain, question, option_a, option_b, option_c, option_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [domain, seed.question, seed.option_a, seed.option_b, seed.option_c, seed.option_d, seed.correct_answer]
        );
      }
    }
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

    await ensureQuestionSeeds(admin);

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
