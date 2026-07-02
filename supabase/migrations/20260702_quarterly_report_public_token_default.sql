ALTER TABLE social_quarterly_reports
ALTER COLUMN public_link_token SET DEFAULT gen_random_uuid()::text;

DROP POLICY IF EXISTS "Public can view published quarterly reports" ON social_quarterly_reports;
CREATE POLICY "Public can view published quarterly reports" ON social_quarterly_reports
  FOR SELECT TO anon
  USING (is_published = true AND (public_link_expires_at IS NULL OR public_link_expires_at > now()));

DROP POLICY IF EXISTS "Public can view projects for published quarterly reports" ON social_projects;
CREATE POLICY "Public can view projects for published quarterly reports" ON social_projects
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM social_quarterly_reports sqr
      WHERE sqr.project_id = social_projects.id
      AND sqr.is_published = true
      AND (sqr.public_link_expires_at IS NULL OR sqr.public_link_expires_at > now())
    )
  );

DROP POLICY IF EXISTS "Public can view posts for published quarterly reports" ON social_posts;
CREATE POLICY "Public can view posts for published quarterly reports" ON social_posts
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM social_quarterly_reports sqr
      WHERE sqr.project_id = social_posts.project_id
      AND sqr.is_published = true
      AND (sqr.public_link_expires_at IS NULL OR sqr.public_link_expires_at > now())
    )
  );

DROP POLICY IF EXISTS "Public can view companies for published quarterly reports" ON companies;
CREATE POLICY "Public can view companies for published quarterly reports" ON companies
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM social_projects sp
      JOIN social_quarterly_reports sqr ON sqr.project_id = sp.id
      WHERE sp.company_id = companies.id
      AND sqr.is_published = true
      AND (sqr.public_link_expires_at IS NULL OR sqr.public_link_expires_at > now())
    )
  );
