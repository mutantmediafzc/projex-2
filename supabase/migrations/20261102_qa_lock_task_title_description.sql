-- QA Tracking: task title and description are set by the QA lead only.
-- Team members can no longer change them from their task link.
--
-- Replaces qa_save_task with a version that does not accept or write the
-- title / description. Run after 20261101_create_qa_tracking.sql.
-- Safe to run more than once.

drop function if exists public.qa_save_task(text, text, text, text, jsonb, jsonb, boolean);

create or replace function public.qa_save_task(
  p_token text,
  p_pr_url text,
  p_breakdown jsonb,
  p_cases jsonb,
  p_submit boolean default false
)
returns uuid
language plpgsql
as $$
declare
  v_task public.qa_tasks%rowtype;
  v_member_name text;
  v_case jsonb;
  v_pos integer := 0;
  v_case_count integer;
  v_incomplete integer;
begin
  select * into v_task from public.qa_tasks
    where public_token = p_token
    for update;

  if not found then
    raise exception 'QA task not found' using errcode = 'P0002';
  end if;

  if v_task.status = 'submitted' then
    raise exception 'This QA task has already been submitted and is locked'
      using errcode = 'P0001';
  end if;

  if p_breakdown is null or jsonb_typeof(p_breakdown) <> 'array' then
    p_breakdown := '[]'::jsonb;
  end if;
  if p_cases is null or jsonb_typeof(p_cases) <> 'array' then
    p_cases := '[]'::jsonb;
  end if;

  -- Title and description are intentionally not touched here.
  update public.qa_tasks set
    pr_url = coalesce(btrim(p_pr_url), ''),
    breakdown = p_breakdown
  where id = v_task.id;

  delete from public.qa_test_cases where task_id = v_task.id;

  for v_case in select * from jsonb_array_elements(p_cases) loop
    if coalesce(btrim(v_case->>'title'), '') <> '' then
      insert into public.qa_test_cases
        (task_id, position, title, steps, expected_result, status, comment)
      values (
        v_task.id,
        v_pos,
        btrim(v_case->>'title'),
        coalesce(v_case->>'steps', ''),
        coalesce(v_case->>'expected_result', ''),
        case when v_case->>'status' in ('passed', 'failed', 'blocked')
          then v_case->>'status' else 'not_run' end,
        coalesce(v_case->>'comment', '')
      );
      v_pos := v_pos + 1;
    end if;
  end loop;

  if p_submit then
    if btrim(v_task.title) = '' then
      raise exception 'This task has no title yet. Ask your QA lead to add one before submitting'
        using errcode = '22023';
    end if;
    if coalesce(btrim(p_pr_url), '') = '' then
      raise exception 'PR link is required' using errcode = '22023';
    end if;
    if jsonb_array_length(p_breakdown) = 0 then
      raise exception 'Add at least one breakdown item' using errcode = '22023';
    end if;

    select count(*),
           count(*) filter (where status = 'not_run'
             or (status in ('failed', 'blocked') and btrim(comment) = ''))
      into v_case_count, v_incomplete
      from public.qa_test_cases where task_id = v_task.id;

    if v_case_count = 0 then
      raise exception 'Add at least one test case' using errcode = '22023';
    end if;
    if v_incomplete > 0 then
      raise exception 'Every test case needs a result, and failed or blocked cases need a comment'
        using errcode = '22023';
    end if;

    select coalesce(nullif(btrim(full_name), ''), email, 'Team member')
      into v_member_name
      from public.users where id = v_task.assignee_id;

    update public.qa_tasks set
      status = 'submitted',
      submitted_at = now(),
      submitted_by_name = coalesce(v_member_name, 'Team member')
    where id = v_task.id;

    insert into public.qa_task_events (task_id, event_type, actor_id, actor_name, details)
    values (v_task.id, 'submitted', v_task.assignee_id, v_member_name,
      jsonb_build_object('case_count', v_case_count));
  end if;

  return v_task.id;
end;
$$;

revoke all on function public.qa_save_task(text, text, jsonb, jsonb, boolean) from public;
revoke all on function public.qa_save_task(text, text, jsonb, jsonb, boolean) from anon, authenticated;
grant execute on function public.qa_save_task(text, text, jsonb, jsonb, boolean) to service_role;
