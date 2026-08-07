CREATE DATABASE IF NOT EXISTS quiz_app;
USE quiz_app;

CREATE TABLE IF NOT EXISTS profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  education VARCHAR(100) DEFAULT NULL,
  experience VARCHAR(100) DEFAULT NULL,
  domain_interest VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
);

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
);

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
);

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
);

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
('Cybersecurity', 'Which attack tricks users into revealing credentials?', 'DDoS', 'Phishing', 'SQL Injection', 'Brute Force', 'B');
