-- Tripify AI writes: analysis persistence + AI chat messages via authorized RPCs.
-- Local-only migration. Review before applying to any remote project.
begin;

-- Authenticated members may insert their own analysis request record through
-- this RPC only; no direct INSERT grant is given on ai_analyses.
create function tripify_private.ai_analysis_save(
  p_trip uuid,
  p_request uuid,
  p_version bigint,
  p_prompt text,
  p_model text,
  p_status text,
  p_result jsonb default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  t public.trips;
  id uuid;
begin
  if p_request is null then raise exception 'INVALID_REQUEST' using errcode = '22023'; end if;
  if p_status not in ('completed', 'failed') then raise exception 'INVALID_STATUS' using errcode = '22023'; end if;
  if p_prompt is null or char_length(btrim(p_prompt)) not between 1 and 4000 then
    raise exception 'INVALID_PROMPT' using errcode = '22023';
  end if;
  select * into t from public.trips where id = p_trip;
  if not found then raise exception 'TRIP_NOT_FOUND' using errcode = '22023'; end if;
  if not tripify_private.can_read(p_trip) then raise exception 'TRIP_FORBIDDEN' using errcode = '42501'; end if;
  insert into public.ai_analyses(trip_id, created_by, client_request_id, base_trip_version, prompt, model, status, result)
  values (p_trip, auth.uid(), p_request, p_version, btrim(p_prompt), p_model, p_status, p_result)
  on conflict (trip_id, created_by, client_request_id) do update
    set status = excluded.status, result = excluded.result
  returning id into id;
  return id;
end $$;

-- AI teammate messages are written by the server after authorizing the caller
-- as a trip member. Browser clients never insert chat rows directly.
create function tripify_private.ai_post_message(
  p_trip uuid,
  p_content text,
  p_kind text default 'ai'
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  row public.chat_messages;
begin
  if p_kind not in ('ai', 'recommendation', 'proposal', 'alert', 'system') then
    raise exception 'INVALID_KIND' using errcode = '22023';
  end if;
  if p_content is null or char_length(btrim(p_content)) not between 1 and 2000 then
    raise exception 'INVALID_CONTENT' using errcode = '22023';
  end if;
  if not tripify_private.can_read(p_trip) then raise exception 'TRIP_FORBIDDEN' using errcode = '42501'; end if;
  insert into public.chat_messages(trip_id, user_id, content, message_type)
  values (p_trip, auth.uid(), btrim(p_content), p_kind)
  returning * into row;
  return to_jsonb(row);
end $$;

create function public.trip_ai_analysis_save(
  p_trip uuid,
  p_request uuid,
  p_version bigint,
  p_prompt text,
  p_model text,
  p_status text,
  p_result jsonb default null
) returns uuid
language sql security invoker set search_path = '' as $$
  select tripify_private.ai_analysis_save(p_trip, p_request, p_version, p_prompt, p_model, p_status, p_result);
$$;

create function public.trip_ai_post_message(
  p_trip uuid,
  p_content text,
  p_kind text default 'ai'
) returns jsonb
language sql security invoker set search_path = '' as $$
  select tripify_private.ai_post_message(p_trip, p_content, p_kind);
$$;

revoke all on function
  tripify_private.ai_analysis_save(uuid, uuid, bigint, text, text, text, jsonb),
  tripify_private.ai_post_message(uuid, text, text),
  public.trip_ai_analysis_save(uuid, uuid, bigint, text, text, text, jsonb),
  public.trip_ai_post_message(uuid, text, text)
  from public, anon, authenticated;
grant execute on function
  public.trip_ai_analysis_save(uuid, uuid, bigint, text, text, text, jsonb),
  public.trip_ai_post_message(uuid, text, text)
  to authenticated;

commit;
