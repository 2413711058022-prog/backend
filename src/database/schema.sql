-- GovExam Portal — Database Schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS govexam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE govexam;

-- ── Roles ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id        TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name      VARCHAR(20) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36)     PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id       TINYINT UNSIGNED NOT NULL DEFAULT 2,
  phone         VARCHAR(15),
  department    VARCHAR(100),
  employee_id   VARCHAR(50),
  avatar_url    VARCHAR(255),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_login    DATETIME,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- ── Refresh tokens ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         CHAR(36) PRIMARY KEY,
  user_id    CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- ── Topics / Subjects ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topics (
  id         INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name       VARCHAR(200) NOT NULL,
  slug       VARCHAR(200) NOT NULL UNIQUE,
  source     VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Questions ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id               INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  topic_id         INT UNSIGNED NOT NULL,
  question_text    TEXT NOT NULL,
  option_a         VARCHAR(500) NOT NULL,
  option_b         VARCHAR(500) NOT NULL,
  option_c         VARCHAR(500) NOT NULL,
  option_d         VARCHAR(500) NOT NULL,
  correct_answer   VARCHAR(500) NOT NULL,
  explanation      TEXT,
  difficulty_level TINYINT UNSIGNED DEFAULT 0 COMMENT '0=easy,1=medium,2=hard',
  source           VARCHAR(100),
  status           ENUM('active','inactive') DEFAULT 'active',
  hide_flag        BOOLEAN DEFAULT FALSE,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  INDEX idx_topic (topic_id),
  INDEX idx_status (status)
);

-- ── Exams ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id                CHAR(36)     PRIMARY KEY,
  title             VARCHAR(200) NOT NULL,
  description       TEXT,
  topic_id          INT UNSIGNED,
  total_questions   INT UNSIGNED NOT NULL DEFAULT 10,
  duration_minutes  INT UNSIGNED NOT NULL DEFAULT 30,
  pass_percentage   DECIMAL(5,2) NOT NULL DEFAULT 40.00,
  negative_marking  DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  marks_per_question DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  randomize_questions BOOLEAN DEFAULT TRUE,
  is_published      BOOLEAN DEFAULT FALSE,
  scheduled_at      DATETIME,
  expires_at        DATETIME,
  created_by        CHAR(36) NOT NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_published (is_published),
  INDEX idx_scheduled (scheduled_at)
);

-- ── Exam-Question mapping ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_questions (
  exam_id     CHAR(36)     NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  order_no    INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (exam_id, question_id),
  FOREIGN KEY (exam_id)     REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- ── Exam Attempts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_attempts (
  id              CHAR(36)     PRIMARY KEY,
  exam_id         CHAR(36)     NOT NULL,
  user_id         CHAR(36)     NOT NULL,
  started_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at    DATETIME,
  score           DECIMAL(6,2),
  total_marks     DECIMAL(6,2),
  percentage      DECIMAL(5,2),
  passed          BOOLEAN,
  time_taken_secs INT UNSIGNED,
  tab_switches    INT UNSIGNED DEFAULT 0,
  status          ENUM('in_progress','submitted','timed_out') DEFAULT 'in_progress',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id)  REFERENCES exams(id),
  FOREIGN KEY (user_id)  REFERENCES users(id),
  INDEX idx_user_exam (user_id, exam_id),
  INDEX idx_status (status)
);

-- ── Answers submitted per attempt ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attempt_answers (
  id           INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  attempt_id   CHAR(36)     NOT NULL,
  question_id  INT UNSIGNED NOT NULL,
  selected_ans VARCHAR(500),
  is_correct   BOOLEAN,
  is_marked    BOOLEAN DEFAULT FALSE,
  answered_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attempt_id)  REFERENCES exam_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id),
  INDEX idx_attempt (attempt_id)
);

-- ── Certificates ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificates (
  id           CHAR(36)     PRIMARY KEY,
  user_id      CHAR(36)     NOT NULL,
  attempt_id   CHAR(36)     NOT NULL UNIQUE,
  cert_number  VARCHAR(50)  NOT NULL UNIQUE,
  issued_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  pdf_path     VARCHAR(255),
  FOREIGN KEY (user_id)    REFERENCES users(id),
  FOREIGN KEY (attempt_id) REFERENCES exam_attempts(id)
);

-- ── Activity logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id         INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id    CHAR(36),
  action     VARCHAR(100) NOT NULL,
  entity     VARCHAR(50),
  entity_id  VARCHAR(50),
  ip_address VARCHAR(45),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
);
