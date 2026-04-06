-- Enable public/anonymous read access for published strategies
-- This allows external users to view strategy reports via public links

-- 1. Allow anonymous access to social_strategy_links for published strategies
DROP POLICY IF EXISTS "Public can view published strategies" ON social_strategy_links;
CREATE POLICY "Public can view published strategies" ON social_strategy_links
  FOR SELECT TO anon
  USING (is_published = true AND (public_link_expires_at IS NULL OR public_link_expires_at > now()));

-- 2. Allow anonymous access to social_projects (needed for strategy page to show project info)
DROP POLICY IF EXISTS "Public can view projects for published strategies" ON social_projects;
CREATE POLICY "Public can view projects for published strategies" ON social_projects
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM social_strategy_links ssl 
      WHERE ssl.project_id = social_projects.id 
      AND ssl.is_published = true 
      AND (ssl.public_link_expires_at IS NULL OR ssl.public_link_expires_at > now())
    )
  );

-- 3. Allow anonymous access to social_kpis for published strategies
DROP POLICY IF EXISTS "Public can view KPIs for published strategies" ON social_kpis;
CREATE POLICY "Public can view KPIs for published strategies" ON social_kpis
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM social_strategy_links ssl 
      WHERE ssl.id = social_kpis.strategy_id 
      AND ssl.is_published = true 
      AND (ssl.public_link_expires_at IS NULL OR ssl.public_link_expires_at > now())
    )
  );

-- 4. Allow anonymous access to social_posts for published strategies
DROP POLICY IF EXISTS "Public can view posts for published strategies" ON social_posts;
CREATE POLICY "Public can view posts for published strategies" ON social_posts
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM social_strategy_links ssl 
      WHERE ssl.project_id = social_posts.project_id 
      AND ssl.is_published = true 
      AND (ssl.public_link_expires_at IS NULL OR ssl.public_link_expires_at > now())
    )
  );

-- 5. Allow anonymous access to email_campaigns for published strategies
DROP POLICY IF EXISTS "Public can view campaigns for published strategies" ON email_campaigns;
CREATE POLICY "Public can view campaigns for published strategies" ON email_campaigns
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM social_strategy_links ssl 
      WHERE ssl.project_id = email_campaigns.project_id 
      AND ssl.is_published = true 
      AND (ssl.public_link_expires_at IS NULL OR ssl.public_link_expires_at > now())
    )
  );

-- 6. Allow anonymous access to website_blogs for published strategies
DROP POLICY IF EXISTS "Public can view blogs for published strategies" ON website_blogs;
CREATE POLICY "Public can view blogs for published strategies" ON website_blogs
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM social_strategy_links ssl 
      WHERE ssl.project_id = website_blogs.project_id 
      AND ssl.is_published = true 
      AND (ssl.public_link_expires_at IS NULL OR ssl.public_link_expires_at > now())
    )
  );

-- 7. Allow anonymous access to social_reports for published strategies (for monthly KPI data)
DROP POLICY IF EXISTS "Public can view reports for published strategies" ON social_reports;
CREATE POLICY "Public can view reports for published strategies" ON social_reports
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM social_strategy_links ssl 
      WHERE ssl.project_id = social_reports.project_id 
      AND ssl.is_published = true 
      AND (ssl.public_link_expires_at IS NULL OR ssl.public_link_expires_at > now())
    )
  );

-- 8. Allow anonymous access to companies for published strategies (for company logo/name)
DROP POLICY IF EXISTS "Public can view companies for published strategies" ON companies;
CREATE POLICY "Public can view companies for published strategies" ON companies
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM social_projects sp
      JOIN social_strategy_links ssl ON ssl.project_id = sp.id
      WHERE sp.company_id = companies.id 
      AND ssl.is_published = true 
      AND (ssl.public_link_expires_at IS NULL OR ssl.public_link_expires_at > now())
    )
  );
