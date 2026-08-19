-- Approved leave requests have already incremented the user's used balance.
-- Restore those days atomically whenever HR deletes the request.
CREATE OR REPLACE FUNCTION restore_leave_balance_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'approved' THEN
    IF OLD.leave_type = 'annual' THEN
      UPDATE users
      SET annual_leave_used = GREATEST(0, annual_leave_used - OLD.days_count)
      WHERE id = OLD.user_id;
    ELSIF OLD.leave_type = 'sick' THEN
      UPDATE users
      SET sick_leave_used = GREATEST(0, sick_leave_used - OLD.days_count)
      WHERE id = OLD.user_id;
    ELSIF OLD.leave_type = 'maternity' THEN
      UPDATE users
      SET maternity_leave_used = GREATEST(0, maternity_leave_used - OLD.days_count)
      WHERE id = OLD.user_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leave_balance_restore_on_delete_trigger ON leaves;
CREATE TRIGGER leave_balance_restore_on_delete_trigger
  BEFORE DELETE ON leaves
  FOR EACH ROW
  EXECUTE FUNCTION restore_leave_balance_on_delete();
