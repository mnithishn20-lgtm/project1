/*
# IT Quiz App - Database Schema

1. Overview
This is a single-tenant (no-auth) quiz application. Users fill an application form
to create a profile (stored in localStorage on the client). Quizzes, attempts,
daily progress, and aggregate stats are all tracked against that profile id.

2. New Tables
- `profiles`: User details collected from the application form.
  - id (uuid, pk), name, email, phone, education, experience, domain_interest, created_at
- `questions`: IT-domain quiz questions across 5 domains.
  - id (uuid, pk), domain, question, option_a..d, correct_answer (A/B/C/D), created_at
- `quiz_attempts`: Each individual question answered by a user.
  - id (uuid, pk), profile_id (fk), question_id (fk), selected_answer, is_correct, attempted_at
- `daily_progress`: Per-day aggregate per profile (unique profile+date).
  - id (uuid, pk), profile_id (fk), date, questions_answered, correct_count, marks
- `user_stats`: Aggregate stats per profile (streaks, total marks).
  - profile_id (uuid, pk, fk), total_marks, current_streak, longest_streak, last_active_date, total_answered, total_correct

3. Security (RLS)
- All tables enable RLS.
- All policies use `TO anon, authenticated` because this is a no-auth app
  (the anon-key client must be able to read/write its own data).
- Data is intentionally shared/public across the anon client; ownership is
  enforced logically in the app via the profile_id stored in localStorage.

4. Notes
- 5 IT domains: Programming, Networking, Databases, Web Development, Cybersecurity.
- Enough questions seeded (50) to support 20/day without repetition.
- Marks: 5 per correct answer.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  education text,
  experience text,
  domain_interest text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
CREATE POLICY "anon_select_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;
CREATE POLICY "anon_delete_profiles" ON profiles FOR DELETE
  TO anon, authenticated USING (true);

-- Questions
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer text NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_questions" ON questions;
CREATE POLICY "anon_select_questions" ON questions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_questions" ON questions;
CREATE POLICY "anon_insert_questions" ON questions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Quiz attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer text NOT NULL,
  is_correct boolean NOT NULL,
  attempted_at timestamptz DEFAULT now()
);
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_profile ON quiz_attempts(profile_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_question ON quiz_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_time ON quiz_attempts(attempted_at);

DROP POLICY IF EXISTS "anon_select_attempts" ON quiz_attempts;
CREATE POLICY "anon_select_attempts" ON quiz_attempts FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_attempts" ON quiz_attempts;
CREATE POLICY "anon_insert_attempts" ON quiz_attempts FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_attempts" ON quiz_attempts;
CREATE POLICY "anon_update_attempts" ON quiz_attempts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_attempts" ON quiz_attempts;
CREATE POLICY "anon_delete_attempts" ON quiz_attempts FOR DELETE
  TO anon, authenticated USING (true);

-- Daily progress
CREATE TABLE IF NOT EXISTS daily_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  questions_answered integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  marks integer NOT NULL DEFAULT 0,
  UNIQUE (profile_id, date)
);
ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_daily_progress_profile ON daily_progress(profile_id);

DROP POLICY IF EXISTS "anon_select_daily" ON daily_progress;
CREATE POLICY "anon_select_daily" ON daily_progress FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_daily" ON daily_progress;
CREATE POLICY "anon_insert_daily" ON daily_progress FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_daily" ON daily_progress;
CREATE POLICY "anon_update_daily" ON daily_progress FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_daily" ON daily_progress;
CREATE POLICY "anon_delete_daily" ON daily_progress FOR DELETE
  TO anon, authenticated USING (true);

-- User stats (aggregate)
CREATE TABLE IF NOT EXISTS user_stats (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_marks integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  total_answered integer NOT NULL DEFAULT 0,
  total_correct integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_stats" ON user_stats;
CREATE POLICY "anon_select_stats" ON user_stats FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_stats" ON user_stats;
CREATE POLICY "anon_insert_stats" ON user_stats FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_stats" ON user_stats;
CREATE POLICY "anon_update_stats" ON user_stats FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_stats" ON user_stats;
CREATE POLICY "anon_delete_stats" ON user_stats FOR DELETE
  TO anon, authenticated USING (true);

-- Seed IT questions across 5 domains (20 each = 100 total)
INSERT INTO questions (domain, question, option_a, option_b, option_c, option_d, correct_answer) VALUES
-- Programming
('Programming', 'Which of the following is NOT a programming paradigm?', 'Object-Oriented', 'Functional', 'Relational', 'Procedural', 'C'),
('Programming', 'What does "OOP" stand for?', 'Object Oriented Programming', 'Open Output Protocol', 'Online Operation Process', 'Ordered Object Pattern', 'A'),
('Programming', 'Which keyword is used to define a constant in JavaScript (ES6+)?', 'var', 'let', 'const', 'static', 'C'),
('Programming', 'Which data structure uses LIFO (Last In First Out)?', 'Queue', 'Stack', 'Array', 'Linked List', 'B'),
('Programming', 'What is the time complexity of binary search?', 'O(n)', 'O(n log n)', 'O(1)', 'O(log n)', 'D'),
('Programming', 'Which language is primarily used for Android native development?', 'Swift', 'Kotlin', 'Ruby', 'PHP', 'B'),
('Programming', 'What is a "closure" in JavaScript?', 'A loop structure', 'A function with access to its outer scope', 'A type of variable', 'An error handler', 'B'),
('Programming', 'Which symbol is used for single-line comments in Python?', '//', '#', '--', '/*', 'B'),
('Programming', 'What does "DRY" principle stand for?', 'Do Repeat Yourself', 'Dont Repeat Yourself', 'Data Ready Yield', 'Direct Run Yield', 'B'),
('Programming', 'Which of these is a statically typed language?', 'Python', 'JavaScript', 'Java', 'Ruby', 'C'),
-- Networking
('Networking', 'What does "IP" stand for in networking?', 'Internet Provider', 'Internet Protocol', 'Internal Process', 'Information Path', 'B'),
('Networking', 'Which port is used by HTTPS by default?', '80', '21', '443', '8080', 'C'),
('Networking', 'What is the default subnet mask for a Class C network?', '255.0.0.0', '255.255.0.0', '255.255.255.0', '255.255.255.255', 'C'),
('Networking', 'Which protocol is connectionless?', 'TCP', 'UDP', 'HTTP', 'FTP', 'B'),
('Networking', 'What does DNS resolve?', 'IP to MAC', 'Domain name to IP', 'Port to IP', 'MAC to IP', 'B'),
('Networking', 'Which layer of the OSI model is responsible for routing?', 'Data Link', 'Network', 'Transport', 'Session', 'B'),
('Networking', 'How many bits are in an IPv6 address?', '32', '64', '128', '256', 'C'),
('Networking', 'Which device operates at the Data Link layer?', 'Router', 'Hub', 'Switch', 'Repeater', 'C'),
('Networking', 'What does "NAT" stand for?', 'Network Address Translation', 'Network Access Token', 'Node Address Table', 'Network Application Tool', 'A'),
('Networking', 'Which protocol guarantees ordered delivery of packets?', 'UDP', 'IP', 'TCP', 'ICMP', 'C'),
-- Databases
('Databases', 'What does "SQL" stand for?', 'Simple Query Language', 'Structured Query Language', 'Standard Query Logic', 'Sequential Query Language', 'B'),
('Databases', 'Which SQL clause is used to filter results?', 'ORDER BY', 'GROUP BY', 'WHERE', 'HAVING', 'C'),
('Databases', 'Which key uniquely identifies a row in a table?', 'Foreign Key', 'Primary Key', 'Candidate Key', 'Super Key', 'B'),
('Databases', 'What is normalization in databases?', 'Adding redundancy', 'Organizing data to reduce redundancy', 'Encrypting data', 'Indexing data', 'B'),
('Databases', 'Which join returns only matching rows from both tables?', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN', 'C'),
('Databases', 'What is an "ACID" property in databases?', 'A type of index', 'Atomicity, Consistency, Isolation, Durability', 'A query language', 'A storage engine', 'B'),
('Databases', 'Which command removes all rows but keeps the table structure?', 'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'C'),
('Databases', 'What is a "view" in SQL?', 'A stored procedure', 'A virtual table based on a query', 'A backup copy', 'A type of index', 'B'),
('Databases', 'Which NoSQL database is document-based?', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'C'),
('Databases', 'Which keyword is used to remove duplicate rows in a SELECT?', 'UNIQUE', 'DISTINCT', 'GROUP', 'FILTER', 'B'),
-- Web Development
('Web Development', 'What does "HTML" stand for?', 'Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyperlink Text Management', 'A'),
('Web Development', 'Which CSS property controls spacing between elements inside a flex container?', 'margin', 'padding', 'gap', 'space', 'C'),
('Web Development', 'What does "DOM" stand for?', 'Document Object Model', 'Data Object Model', 'Document Oriented Markup', 'Display Object Model', 'A'),
('Web Development', 'Which HTTP method is idempotent and used to retrieve data?', 'POST', 'GET', 'PATCH', 'CONNECT', 'B'),
('Web Development', 'Which React hook is used for state management?', 'useEffect', 'useState', 'useRef', 'useMemo', 'B'),
('Web Development', 'What is "CORS"?', 'A CSS framework', 'Cross-Origin Resource Sharing', 'A JS library', 'A build tool', 'B'),
('Web Development', 'Which tag is used for the largest heading in HTML?', '<h6>', '<head>', '<h1>', '<header>', 'C'),
('Web Development', 'What does "AJAX" stand for?', 'Asynchronous JavaScript and XML', 'Advanced JavaScript and XML', 'Automated JSON and XML', 'Active Java and XML', 'A'),
('Web Development', 'Which CSS unit is relative to the root font size?', 'em', 'rem', 'px', 'vh', 'B'),
('Web Development', 'Which attribute makes an input field mandatory in HTML?', 'optional', 'required', 'mandatory', 'must', 'B'),
-- Cybersecurity
('Cybersecurity', 'What does "VPN" stand for?', 'Virtual Private Network', 'Verified Public Node', 'Visual Process Network', 'Virtual Process Node', 'A'),
('Cybersecurity', 'Which type of attack tricks users into revealing credentials?', 'DDoS', 'Phishing', 'SQL Injection', 'Brute Force', 'B'),
('Cybersecurity', 'What is "encryption"?', 'Deleting data', 'Converting data into a code to prevent unauthorized access', 'Compressing data', 'Backing up data', 'B'),
('Cybersecurity', 'Which of these is a strong password?', 'password123', 'qwerty', 'P@ssw0rd!2024#x', '12345678', 'C'),
('Cybersecurity', 'What does "XSS" stand for?', 'Cross-Site Scripting', 'Extra Security System', 'XML Secure Socket', 'Extended Session Service', 'A'),
('Cybersecurity', 'Which attack floods a server with traffic to make it unavailable?', 'Phishing', 'DDoS', 'Spoofing', 'Sniffing', 'B'),
('Cybersecurity', 'What is a "firewall"?', 'A virus scanner', 'A network security system that monitors and controls traffic', 'A backup tool', 'An encryption tool', 'B'),
('Cybersecurity', 'What does "MFA" stand for?', 'Multi-Factor Authentication', 'Main File Access', 'Multiple File Allocation', 'Managed File Access', 'A'),
('Cybersecurity', 'Which protocol is used for secure web browsing?', 'HTTP', 'HTTPS', 'FTP', 'SMTP', 'B'),
('Cybersecurity', 'What is "social engineering" in security?', 'Building social networks', 'Manipulating people into divulging confidential info', 'Engineering social media apps', 'A type of malware', 'B'),
-- Additional Programming questions
('Programming', 'Which data structure uses FIFO (First In First Out)?', 'Stack', 'Queue', 'Tree', 'Graph', 'B'),
('Programming', 'What does API stand for?', 'Application Programming Interface', 'Applied Program Internet', 'Advanced Process Integration', 'Application Protocol Index', 'A'),
('Programming', 'Which sorting algorithm has average time complexity O(n log n)?', 'Bubble Sort', 'Selection Sort', 'Merge Sort', 'Linear Search', 'C'),
('Programming', 'What is recursion?', 'A function calling itself', 'A loop that never ends', 'A database query', 'A compiler error', 'A'),
('Programming', 'Which operator is commonly used for equality without type coercion in JavaScript?', '==', '===', '=', '!=', 'B'),
('Programming', 'What is a variable?', 'A named storage location for data', 'A fixed hardware device', 'A network address', 'A database table only', 'A'),
('Programming', 'Which concept hides internal implementation details?', 'Encapsulation', 'Compilation', 'Iteration', 'Serialization', 'A'),
('Programming', 'What is pseudocode used for?', 'Planning algorithms in human-readable steps', 'Encrypting source code', 'Running code in production', 'Styling web pages', 'A'),
('Programming', 'Which Git command records staged changes?', 'git push', 'git commit', 'git clone', 'git fetch', 'B'),
('Programming', 'What does IDE stand for?', 'Integrated Development Environment', 'Internal Data Engine', 'Internet Design Editor', 'Interactive Debug Event', 'A'),
-- Additional Networking questions
('Networking', 'Which protocol automatically assigns IP addresses to devices?', 'DNS', 'DHCP', 'SMTP', 'SNMP', 'B'),
('Networking', 'Which command is commonly used to test reachability to another host?', 'ping', 'mkdir', 'grep', 'chmod', 'A'),
('Networking', 'What does LAN stand for?', 'Local Area Network', 'Large Access Node', 'Linked Application Network', 'Logical Address Name', 'A'),
('Networking', 'Which OSI layer provides end-to-end transport services?', 'Physical', 'Data Link', 'Transport', 'Presentation', 'C'),
('Networking', 'What is the default port for HTTP?', '22', '25', '80', '110', 'C'),
('Networking', 'Which protocol translates IP addresses to MAC addresses on a local network?', 'ARP', 'DNS', 'HTTP', 'TLS', 'A'),
('Networking', 'What does SSID identify?', 'A wireless network name', 'A router password only', 'A public IP block', 'A TCP port', 'A'),
('Networking', 'Which cable type is commonly used for wired Ethernet?', 'Coaxial audio', 'Twisted pair', 'HDMI', 'Fiber only', 'B'),
('Networking', 'What is packet switching?', 'Breaking data into packets for transmission', 'Changing a keyboard layout', 'Replacing a router battery', 'Compressing images only', 'A'),
('Networking', 'Which address type is 48 bits and assigned to network interfaces?', 'IPv4 address', 'IPv6 address', 'MAC address', 'Port number', 'C'),
-- Additional Databases questions
('Databases', 'Which SQL command adds new rows to a table?', 'INSERT', 'UPDATE', 'ALTER', 'GRANT', 'A'),
('Databases', 'Which SQL command changes existing rows?', 'SELECT', 'UPDATE', 'CREATE', 'COMMIT', 'B'),
('Databases', 'What is an index used for?', 'Speeding up data retrieval', 'Deleting duplicate tables', 'Encrypting passwords', 'Formatting text', 'A'),
('Databases', 'Which relationship uses a junction table?', 'One-to-one', 'One-to-many', 'Many-to-many', 'Self-only', 'C'),
('Databases', 'What does a foreign key reference?', 'A primary key in another table', 'A CSS selector', 'A file path', 'A memory address', 'A'),
('Databases', 'Which SQL clause sorts results?', 'WHERE', 'ORDER BY', 'JOIN', 'LIMIT', 'B'),
('Databases', 'What is a transaction?', 'A group of database operations treated as one unit', 'A table column type', 'A web request header', 'A NoSQL document only', 'A'),
('Databases', 'Which command permanently saves a transaction?', 'ROLLBACK', 'COMMIT', 'DROP', 'EXPLAIN', 'B'),
('Databases', 'Which database model stores data as key-value pairs?', 'Relational', 'Key-value', 'Hierarchical only', 'Column header only', 'B'),
('Databases', 'What does CRUD stand for?', 'Create, Read, Update, Delete', 'Copy, Run, Undo, Deploy', 'Connect, Route, Upload, Download', 'Cache, Render, Use, Debug', 'A'),
-- Additional Web Development questions
('Web Development', 'Which CSS property changes text color?', 'font-size', 'color', 'display', 'position', 'B'),
('Web Development', 'Which JavaScript method parses JSON text?', 'JSON.parse', 'JSON.stringify', 'parseInt', 'Object.keys', 'A'),
('Web Development', 'Which HTTP status code means Not Found?', '200', '301', '404', '500', 'C'),
('Web Development', 'What is responsive design?', 'Design that adapts to different screen sizes', 'A server backup method', 'A database schema rule', 'An antivirus feature', 'A'),
('Web Development', 'Which HTML element loads an external JavaScript file?', '<style>', '<script>', '<link>', '<meta>', 'B'),
('Web Development', 'Which CSS layout module is one-dimensional?', 'Flexbox', 'Grid', 'Canvas', 'SVG', 'A'),
('Web Development', 'What does SPA stand for in web apps?', 'Single Page Application', 'Secure Program Access', 'Server Plugin API', 'Styled Page Asset', 'A'),
('Web Development', 'Which browser API stores key-value data persistently?', 'localStorage', 'fetch', 'Promise', 'MutationObserver', 'A'),
('Web Development', 'Which React hook runs side effects?', 'useState', 'useEffect', 'useId', 'useReducer', 'B'),
('Web Development', 'Which HTML attribute provides alternative text for images?', 'src', 'href', 'alt', 'title', 'C'),
-- Additional Cybersecurity questions
('Cybersecurity', 'What is malware?', 'Software designed to harm or exploit systems', 'A secure backup copy', 'A database index', 'A network cable', 'A'),
('Cybersecurity', 'Which practice helps protect accounts if a password is stolen?', 'MFA', 'Using one password everywhere', 'Disabling updates', 'Sharing credentials', 'A'),
('Cybersecurity', 'What is SQL injection?', 'Injecting malicious SQL through application input', 'Compressing a database', 'Installing SQL software', 'Backing up records', 'A'),
('Cybersecurity', 'Which protocol encrypts traffic for HTTPS?', 'TLS', 'FTP', 'ARP', 'ICMP', 'A'),
('Cybersecurity', 'What is the principle of least privilege?', 'Grant only the access needed', 'Give all users admin rights', 'Disable passwords', 'Store data publicly', 'A'),
('Cybersecurity', 'What is a zero-day vulnerability?', 'A flaw unknown to those who should fix it', 'A password that expires daily', 'A backup made at midnight', 'A firewall rule', 'A'),
('Cybersecurity', 'Which attack tries many password guesses?', 'Brute force', 'Caching', 'Load balancing', 'Refactoring', 'A'),
('Cybersecurity', 'What is hashing commonly used for?', 'One-way data fingerprinting such as password storage', 'Rendering HTML', 'Routing packets only', 'Increasing screen brightness', 'A'),
('Cybersecurity', 'What does antivirus software help detect?', 'Malicious software', 'Broken CSS', 'Slow SQL joins', 'Duplicate files only', 'A'),
('Cybersecurity', 'Which action is safest before clicking a link in an email?', 'Verify the sender and URL', 'Forward it to everyone', 'Enter credentials immediately', 'Disable the browser', 'A')
ON CONFLICT DO NOTHING;
