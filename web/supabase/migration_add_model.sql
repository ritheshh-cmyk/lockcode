-- Run this in the Supabase SQL Editor
ALTER TABLE licenses ADD COLUMN model VARCHAR(50) DEFAULT 'gemini';
UPDATE licenses SET model = 'gemini' WHERE model IS NULL;
