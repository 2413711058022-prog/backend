USE govexam;

-- Link questions to exams
-- Exam 1: PC Hardware (questions 1-20, select 10)
INSERT IGNORE INTO exam_questions (exam_id, question_id, order_no)
SELECT 'exam-0001-0000-0000-000000000001', id, (@row_number:=@row_number + 1) as order_no
FROM questions, (SELECT @row_number:=0) AS t
WHERE topic_id = 1 AND status = 'active'
ORDER BY RAND()
LIMIT 10;

-- Exam 2: LAN Networking (questions 61-100, select 15)
SET @row_number = 0;
INSERT IGNORE INTO exam_questions (exam_id, question_id, order_no)
SELECT 'exam-0002-0000-0000-000000000002', id, (@row_number:=@row_number + 1) as order_no
FROM questions, (SELECT @row_number:=0) AS t
WHERE topic_id = 2 AND status = 'active'
ORDER BY RAND()
LIMIT 15;

-- Exam 3: Internet & Email (questions 121-140, select 10)
SET @row_number = 0;
INSERT IGNORE INTO exam_questions (exam_id, question_id, order_no)
SELECT 'exam-0003-0000-0000-000000000003', id, (@row_number:=@row_number + 1) as order_no
FROM questions, (SELECT @row_number:=0) AS t
WHERE topic_id = 4 AND status = 'active'
ORDER BY RAND()
LIMIT 10;

-- Exam 4: Railway Digital Platforms (questions 141-200, select 20)
SET @row_number = 0;
INSERT IGNORE INTO exam_questions (exam_id, question_id, order_no)
SELECT 'exam-0004-0000-0000-000000000004', id, (@row_number:=@row_number + 1) as order_no
FROM questions, (SELECT @row_number:=0) AS t
WHERE topic_id = 5 AND status = 'active'
ORDER BY RAND()
LIMIT 20;

-- Exam 5: Full Mock Test (all topics, select 30 questions)
SET @row_number = 0;
INSERT IGNORE INTO exam_questions (exam_id, question_id, order_no)
SELECT 'exam-0005-0000-0000-000000000005', id, (@row_number:=@row_number + 1) as order_no
FROM questions, (SELECT @row_number:=0) AS t
WHERE status = 'active'
ORDER BY RAND()
LIMIT 30;

SELECT 'Exam questions linked successfully!' AS status;
