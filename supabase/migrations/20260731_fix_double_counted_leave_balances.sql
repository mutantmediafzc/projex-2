-- Leave approvals are already applied by leave_balance_update_trigger.
-- The API previously applied the same increment a second time.
--
-- Correct only balances that exactly match twice the sum of approved leave
-- requests. This preserves balances that HR has manually adjusted.
WITH approved_totals AS (
  SELECT
    user_id,
    COALESCE(SUM(days_count) FILTER (WHERE leave_type = 'annual'), 0) AS annual_used,
    COALESCE(SUM(days_count) FILTER (WHERE leave_type = 'sick'), 0) AS sick_used,
    COALESCE(SUM(days_count) FILTER (WHERE leave_type = 'maternity'), 0) AS maternity_used
  FROM leaves
  WHERE status = 'approved'
  GROUP BY user_id
)
UPDATE users AS u
SET
  annual_leave_used = CASE
    WHEN u.annual_leave_used = t.annual_used * 2 THEN t.annual_used
    ELSE u.annual_leave_used
  END,
  sick_leave_used = CASE
    WHEN u.sick_leave_used = t.sick_used * 2 THEN t.sick_used
    ELSE u.sick_leave_used
  END,
  maternity_leave_used = CASE
    WHEN u.maternity_leave_used = t.maternity_used * 2 THEN t.maternity_used
    ELSE u.maternity_leave_used
  END
FROM approved_totals AS t
WHERE u.id = t.user_id
  AND (
    u.annual_leave_used = t.annual_used * 2
    OR u.sick_leave_used = t.sick_used * 2
    OR u.maternity_leave_used = t.maternity_used * 2
  );
