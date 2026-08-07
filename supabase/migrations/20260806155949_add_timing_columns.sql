-- Add timing tracking to quiz attempts and stats

ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS time_taken_ms integer;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_time_ms bigint NOT NULL DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS fastest_correct_ms integer;
ALTER TABLE daily_progress ADD COLUMN IF NOT EXISTS total_time_ms bigint NOT NULL DEFAULT 0;
