UPDATE social_quarterly_reports
SET public_link_expires_at = NULL
WHERE is_published = TRUE
  AND public_link_expires_at IS NOT NULL;
