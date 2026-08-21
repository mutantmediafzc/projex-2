ALTER TABLE brand_briefing_form_submissions
  ADD COLUMN IF NOT EXISTS question_answers JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN brand_briefing_form_submissions.question_answers IS
  'Ordered form questions and their submitted answers, including section metadata.';
