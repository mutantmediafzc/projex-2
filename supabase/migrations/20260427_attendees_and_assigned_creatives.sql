-- Add attendee_ids array to appointments (stores user IDs of attendees/members)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS attendee_ids uuid[] DEFAULT '{}';

-- Add assigned_creative_ids array to social_posts
ALTER TABLE social_posts
  ADD COLUMN IF NOT EXISTS assigned_creative_ids uuid[] DEFAULT '{}';
