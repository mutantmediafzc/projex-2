-- Creative / Design Request Management — ROLLBACK
-- Drops only the new feature-specific objects created by creative_requests.sql.
-- Does NOT touch any existing tables.

-- Drop triggers
drop trigger if exists trg_creative_requests_set_updated_at on public.creative_requests;
drop trigger if exists trg_creative_request_responses_set_updated_at on public.creative_request_responses;

-- Drop functions
drop function if exists public.creative_requests_set_updated_at();
drop function if exists public.creative_request_responses_set_updated_at();

-- Drop policies
drop policy if exists "creative_requests_read_authenticated" on public.creative_requests;
drop policy if exists "creative_request_responses_read_authenticated" on public.creative_request_responses;
drop policy if exists "creative_request_notifications_read_own" on public.creative_request_notifications;
drop policy if exists "creative_request_notifications_update_own" on public.creative_request_notifications;

-- Drop tables
drop table if exists public.creative_request_notifications;
drop table if exists public.creative_request_responses;
drop table if exists public.creative_requests;
