USE govexam;

-- Update admin password (Admin@123)
UPDATE users SET password_hash='$2a$12$iVZbRwYz/HxwASlrFcizdO7lHHBpsP9pwcw7fV5v6G3712zubZDvK' WHERE email='admin@govexam.in';

-- Update student password (Student@123)
UPDATE users SET password_hash='$2a$12$tuQjFrsbbSMHfWYfo33dJeieCr3xUeeqLITvryL/VXCdBDg3p1Dvq' WHERE email='student@govexam.in';

-- Verify
SELECT email, password_hash FROM users WHERE email IN ('admin@govexam.in', 'student@govexam.in');
