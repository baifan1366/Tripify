begin;
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null check(char_length(btrim(title)) between 1 and 160),
  reason text not null check(char_length(btrim(reason)) between 1 and 4000),
  base_trip_version bigint not null,
  status text not null default 'open' check(status in ('open','applied','cancelled')),
  applied_version bigint,
  created_at timestamptz not null default now(),
  applied_at timestamptz
);
create table public.proposal_changes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete restrict,
  ordinal smallint not null check(ordinal between 1 and 20),
  operation text not null check(operation in ('activity.add','activity.update','activity.remove')),
  entity_id uuid,
  old_value jsonb,
  new_value jsonb not null,
  unique(proposal_id,ordinal)
);
create table public.proposal_votes (
  proposal_id uuid not null references public.proposals(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  vote text not null check(vote in ('approve','reject')),
  reason text not null default '' check(char_length(reason)<=4000),
  updated_at timestamptz not null default now(),
  primary key(proposal_id,user_id)
);
create table public.user_workspace_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  layout jsonb not null check(jsonb_typeof(layout)='object' and octet_length(layout::text)<=16000),
  updated_at timestamptz not null default now()
);
create table public.trip_drafts (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('chat','proposal','ai')),
  content text not null check(char_length(content)<=10000),
  updated_at timestamptz not null default now(),
  primary key(trip_id,user_id,kind)
);
create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  client_request_id uuid not null,
  base_trip_version bigint not null,
  prompt text not null check(char_length(prompt) between 1 and 4000),
  model text not null,
  status text not null check(status in ('completed','failed')),
  result jsonb,
  created_at timestamptz not null default now(),
  unique(trip_id,created_by,client_request_id)
);
create index proposals_trip_idx on public.proposals(trip_id,created_at desc);
create index proposals_creator_idx on public.proposals(created_by);
create index votes_user_idx on public.proposal_votes(user_id);
create index drafts_user_idx on public.trip_drafts(user_id);
create index analyses_trip_idx on public.ai_analyses(trip_id,created_at desc);
create index analyses_creator_idx on public.ai_analyses(created_by);

alter table public.proposals enable row level security;
alter table public.proposal_changes enable row level security;
alter table public.proposal_votes enable row level security;
alter table public.user_workspace_preferences enable row level security;
alter table public.trip_drafts enable row level security;
alter table public.ai_analyses enable row level security;
revoke all on public.proposals,public.proposal_changes,public.proposal_votes,public.user_workspace_preferences,public.trip_drafts,public.ai_analyses from public,anon,authenticated;
grant select on public.proposals,public.proposal_changes,public.proposal_votes,public.ai_analyses to authenticated;
grant select,insert,update,delete on public.user_workspace_preferences,public.trip_drafts to authenticated;
grant select,insert on public.ai_analyses to service_role;
create policy proposals_read on public.proposals for select to authenticated using(tripify_private.can_read(trip_id));
create policy changes_read on public.proposal_changes for select to authenticated using(exists(select 1 from public.proposals p where p.id=proposal_id));
create policy votes_read on public.proposal_votes for select to authenticated using(exists(select 1 from public.proposals p where p.id=proposal_id));
create policy analyses_read on public.ai_analyses for select to authenticated using(tripify_private.can_read(trip_id));
create policy own_workspace on public.user_workspace_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_trip_draft on public.trip_drafts for all to authenticated using(user_id=(select auth.uid()) and tripify_private.can_read(trip_id)) with check(user_id=(select auth.uid()) and tripify_private.can_read(trip_id));

-- Pure entity mutation helper; only called by already-authorized definer RPCs.
-- No EXECUTE grant to authenticated, anon or PUBLIC.
create function tripify_private.apply_activity_change(p_trip uuid,p_operation text,p_entity uuid,p_data jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare a public.trip_activities; t public.trips; before_state jsonb;
begin
  select * into t from public.trips where id=p_trip;
  if p_data is null or jsonb_typeof(p_data)<>'object' or p_data-array['day_number','start_time','title','location_name','latitude','longitude','google_place_id','duration_minutes','estimated_cost']<>'{}'::jsonb then raise exception 'INVALID_FIELDS' using errcode='22023'; end if;
  if p_operation<>'activity.add' then
    select * into a from public.trip_activities where id=p_entity and trip_id=p_trip;
    if not found then raise exception 'ACTIVITY_NOT_FOUND' using errcode='22023'; end if;
  end if;
  if p_operation='activity.remove' then delete from public.trip_activities where id=a.id; return to_jsonb(a); end if;
  if p_operation not in ('activity.add','activity.update') then raise exception 'INVALID_OPERATION' using errcode='22023'; end if;
  before_state:=to_jsonb(a); a:=jsonb_populate_record(a,p_data);
  if p_operation='activity.update' and to_jsonb(a)=before_state then raise exception 'NO_CHANGES' using errcode='22023'; end if;
  if a.day_number is null or a.day_number<1 or a.day_number>t.end_date-t.start_date+1 then raise exception 'ACTIVITY_OUTSIDE_TRIP' using errcode='22023'; end if;
  if p_operation='activity.add' then
    insert into public.trip_activities(trip_id,day_number,start_time,title,location_name,latitude,longitude,google_place_id,duration_minutes,estimated_cost)
    values(p_trip,a.day_number,a.start_time,a.title,a.location_name,a.latitude,a.longitude,a.google_place_id,a.duration_minutes,coalesce(a.estimated_cost,0)) returning * into a;
  else
    update public.trip_activities set day_number=a.day_number,start_time=a.start_time,title=a.title,location_name=a.location_name,latitude=a.latitude,longitude=a.longitude,google_place_id=a.google_place_id,duration_minutes=a.duration_minutes,estimated_cost=a.estimated_cost,updated_at=now() where id=a.id returning * into a;
  end if;
  return to_jsonb(a);
end $$;
revoke all on function tripify_private.apply_activity_change(uuid,text,uuid,jsonb) from public,anon,authenticated;

create function tripify_private.proposal_create(p_trip uuid,p_expected bigint,p_title text,p_reason text,p_changes jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.trips; pid uuid; item jsonb; old jsonb; n integer:=0;
begin
  select * into t from public.trips where id=p_trip for update;
  if not tripify_private.can_read(p_trip) then raise exception 'TRIP_FORBIDDEN' using errcode='42501'; end if;
  if p_expected is null or t.version<>p_expected then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  if p_changes is null or jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes) not between 1 and 20 then raise exception 'INVALID_CHANGES' using errcode='22023'; end if;
  insert into public.proposals(trip_id,created_by,title,reason,base_trip_version) values(p_trip,auth.uid(),btrim(p_title),btrim(p_reason),t.version) returning id into pid;
  for item in select value from jsonb_array_elements(p_changes) loop
    n:=n+1; old:=null;
    if item->>'operation' not in ('activity.add','activity.update','activity.remove') or jsonb_typeof(item->'data')<>'object' then raise exception 'INVALID_CHANGES' using errcode='22023'; end if;
    if item->>'operation'<>'activity.add' then
      select to_jsonb(a) into old from public.trip_activities a where a.id=(item->>'entityId')::uuid and a.trip_id=p_trip;
      if not found then raise exception 'ACTIVITY_NOT_FOUND' using errcode='22023'; end if;
    end if;
    if (item->'data')-array['day_number','start_time','title','location_name','latitude','longitude','google_place_id','duration_minutes','estimated_cost']<>'{}'::jsonb then raise exception 'INVALID_FIELDS' using errcode='22023'; end if;
    insert into public.proposal_changes(proposal_id,ordinal,operation,entity_id,old_value,new_value) values(pid,n,item->>'operation',nullif(item->>'entityId','')::uuid,old,item->'data');
  end loop;
  return pid;
end $$;

create function tripify_private.proposal_action(p_proposal uuid,p_action text,p_reason text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.proposals; tid uuid; t public.trips; c public.proposal_changes; yes_count integer; member_count integer; entry jsonb;
begin
  select trip_id into tid from public.proposals where id=p_proposal;
  select * into t from public.trips where id=tid for update;
  if not tripify_private.can_read(tid) then raise exception 'TRIP_FORBIDDEN' using errcode='42501'; end if;
  select * into p from public.proposals where id=p_proposal for update;
  if p.status<>'open' then raise exception 'PROPOSAL_CLOSED' using errcode='22023'; end if;
  if p_action='cancel' then
    if auth.uid() not in (p.created_by,t.created_by) then raise exception 'TRIP_FORBIDDEN' using errcode='42501'; end if;
    update public.proposals set status='cancelled' where id=p.id; return jsonb_build_object('status','cancelled');
  end if;
  if t.version<>p.base_trip_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  if p_action in ('approve','reject') then
    insert into public.proposal_votes(proposal_id,user_id,vote,reason) values(p.id,auth.uid(),p_action,p_reason)
    on conflict(proposal_id,user_id) do update set vote=excluded.vote,reason=excluded.reason,updated_at=now();
    return jsonb_build_object('vote',p_action);
  end if;
  if p_action<>'apply' then raise exception 'INVALID_ACTION' using errcode='22023'; end if;
  if auth.uid()<>t.created_by then raise exception 'TRIP_FORBIDDEN' using errcode='42501'; end if;
  select count(*) into member_count from public.trip_members where trip_id=tid;
  select count(*) into yes_count from public.proposal_votes v join public.trip_members m on m.user_id=v.user_id and m.trip_id=tid where v.proposal_id=p.id and v.vote='approve';
  if yes_count*2<=member_count then raise exception 'MAJORITY_REQUIRED' using errcode='22023'; end if;
  for c in select * from public.proposal_changes where proposal_id=p.id order by ordinal loop
    perform tripify_private.apply_activity_change(tid,c.operation,c.entity_id,c.new_value);
  end loop;
  update public.trips set version=version+1,updated_at=now() where id=tid returning * into t;
  entry:=tripify_private.record_version(tid,'proposal.applied',p.title);
  update public.proposals set status='applied',applied_version=t.version,applied_at=now() where id=p.id;
  return jsonb_build_object('newVersion',t.version,'versionEntry',entry);
end $$;
alter table public.trip_versions drop constraint trip_versions_change_type_check;
alter table public.trip_versions add constraint trip_versions_change_type_check check(change_type in ('trip.created','trip.updated','activity.added','activity.updated','activity.removed','proposal.applied'));

create function tripify_private.member_preferences(p_trip uuid,p_data jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare m public.trip_members;
begin
  perform 1 from public.trips where id=p_trip for share;
  select * into m from public.trip_members where trip_id=p_trip and user_id=auth.uid() for update;
  if not found then raise exception 'TRIP_FORBIDDEN' using errcode='42501'; end if;
  if p_data is null or jsonb_typeof(p_data)<>'object' or p_data-array['display_name','interests','dislikes','food_preferences','pace','budget_limit']<>'{}'::jsonb then raise exception 'INVALID_FIELDS' using errcode='22023'; end if;
  m:=jsonb_populate_record(m,p_data);
  update public.trip_members set display_name=m.display_name,interests=m.interests,dislikes=m.dislikes,food_preferences=m.food_preferences,pace=m.pace,budget_limit=m.budget_limit where trip_id=p_trip and user_id=auth.uid();
end $$;

create function public.trip_proposal_create(p_trip uuid,p_expected bigint,p_title text,p_reason text,p_changes jsonb) returns uuid language sql security invoker set search_path='' as $$ select tripify_private.proposal_create(p_trip,p_expected,p_title,p_reason,p_changes); $$;
create function public.trip_proposal_action(p_proposal uuid,p_action text,p_reason text default '') returns jsonb language sql security invoker set search_path='' as $$ select tripify_private.proposal_action(p_proposal,p_action,p_reason); $$;
create function public.trip_member_preferences(p_trip uuid,p_data jsonb) returns void language sql security invoker set search_path='' as $$ select tripify_private.member_preferences(p_trip,p_data); $$;
revoke all on function public.trip_proposal_create(uuid,bigint,text,text,jsonb),public.trip_proposal_action(uuid,text,text),public.trip_member_preferences(uuid,jsonb),tripify_private.proposal_create(uuid,bigint,text,text,jsonb),tripify_private.proposal_action(uuid,text,text),tripify_private.member_preferences(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.trip_proposal_create(uuid,bigint,text,text,jsonb),public.trip_proposal_action(uuid,text,text),public.trip_member_preferences(uuid,jsonb),tripify_private.proposal_create(uuid,bigint,text,text,jsonb),tripify_private.proposal_action(uuid,text,text),tripify_private.member_preferences(uuid,jsonb) to authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then alter publication supabase_realtime add table public.proposals,public.proposal_votes,public.ai_analyses; end if;
end $$;
commit;
