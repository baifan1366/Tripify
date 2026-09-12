-- Reviewed local migration. Never applied automatically to a remote project.
-- Definer implementations are isolated in a NON-EXPOSED schema. Public RPCs
-- are invoker wrappers; authenticated has no direct itinerary/member writes.
begin;
create schema tripify_private;
revoke all on schema tripify_private from public, anon, authenticated;
grant usage on schema tripify_private to authenticated;

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  destination text not null check (char_length(btrim(destination)) between 1 and 120),
  start_date date not null check (isfinite(start_date)),
  end_date date not null check (isfinite(end_date)),
  timezone text not null,
  currency text not null check (currency in ('MYR','USD','JPY','CNY','SGD','EUR')),
  budget_total numeric(12,2) not null check (budget_total between 0 and 9999999999.99),
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date and end_date - start_date < 60)
);
create table public.trip_members (
  trip_id uuid not null references public.trips(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 100),
  interests text not null default '' check (char_length(interests) <= 400),
  dislikes text not null default '' check (char_length(dislikes) <= 400),
  food_preferences text not null default '' check (char_length(food_preferences) <= 400),
  pace text not null default 'balanced' check (pace in ('slow','balanced','active')),
  budget_limit numeric(12,2) check (budget_limit between 0 and 9999999999.99),
  joined_at timestamptz not null default now(),
  primary key (trip_id,user_id)
);
create table public.trip_activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete restrict,
  day_number smallint not null check (day_number > 0),
  start_time time(0) without time zone not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  location_name text not null check (char_length(btrim(location_name)) between 1 and 200),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  google_place_id text check (char_length(google_place_id) between 1 and 400),
  duration_minutes smallint not null check (duration_minutes between 1 and 1440),
  estimated_cost numeric(12,2) not null default 0 check (estimated_cost between 0 and 9999999999.99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null)),
  check (google_place_id is null or latitude is not null)
);
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  message_type text not null default 'user' check (message_type in ('user','system','ai','recommendation','proposal','alert')),
  client_message_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id,user_id,client_message_id)
);
create table public.trip_versions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete restrict,
  version bigint not null check (version > 0),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  change_type text not null check (change_type in ('trip.created','trip.updated','activity.added','activity.updated','activity.removed')),
  summary text not null check (char_length(summary) between 1 and 200),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (trip_id,version)
);
create table public.trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create index trips_creator_idx on public.trips(created_by,created_at desc);
create index members_user_idx on public.trip_members(user_id,trip_id);
create index activities_day_idx on public.trip_activities(trip_id,day_number,start_time,id);
create index chat_timeline_idx on public.chat_messages(trip_id,created_at,id);
create index chat_user_idx on public.chat_messages(user_id);
create index versions_actor_idx on public.trip_versions(actor_user_id);
create index invites_trip_idx on public.trip_invites(trip_id,expires_at);
create index invites_creator_idx on public.trip_invites(created_by);

-- Recursion-safe RLS lookup: only checks the caller, never an arbitrary user.
create function tripify_private.can_read(p_trip uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    exists(select 1 from public.trips where id=p_trip and created_by=auth.uid())
    or exists(select 1 from public.trip_members where trip_id=p_trip and user_id=auth.uid())
  );
$$;
create function tripify_private.is_creator(p_trip uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.trips where id=p_trip and created_by=auth.uid());
$$;

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_activities enable row level security;
alter table public.chat_messages enable row level security;
alter table public.trip_versions enable row level security;
alter table public.trip_invites enable row level security;
revoke all on public.trips,public.trip_members,public.trip_activities,public.chat_messages,public.trip_versions,public.trip_invites from public,anon,authenticated;
grant select on public.trips,public.trip_members,public.trip_activities,public.chat_messages,public.trip_versions to authenticated;
grant select(id,trip_id,created_by,expires_at,accepted_at,created_at) on public.trip_invites to authenticated;
create policy trips_read on public.trips for select to authenticated using (tripify_private.can_read(id));
create policy members_read on public.trip_members for select to authenticated using (tripify_private.can_read(trip_id));
create policy activities_read on public.trip_activities for select to authenticated using (tripify_private.can_read(trip_id));
create policy chat_read on public.chat_messages for select to authenticated using (tripify_private.can_read(trip_id));
create policy versions_read on public.trip_versions for select to authenticated using (tripify_private.can_read(trip_id));
create policy invites_read on public.trip_invites for select to authenticated using (tripify_private.is_creator(trip_id));
-- No direct INSERT/UPDATE/DELETE grant or policy. Every write below authorizes
-- the caller independently, including when invoked directly outside the UI.

create function tripify_private.validate_trip() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone) then
    raise exception 'INVALID_TIMEZONE' using errcode='22023';
  end if;
  return new;
end $$;
create trigger validate_trip before insert or update on public.trips for each row execute function tripify_private.validate_trip();

-- Called only by authorized mutation implementations, never granted directly.
-- Snapshots contain trip metadata + activities, never chat or private preferences.
create function tripify_private.record_version(p_trip uuid,p_type text,p_summary text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare entry public.trip_versions;
begin
  insert into public.trip_versions(trip_id,version,actor_user_id,change_type,summary,snapshot)
  select t.id,t.version,auth.uid(),p_type,p_summary,
    jsonb_build_object('trip',to_jsonb(t),'activities',coalesce((select jsonb_agg(to_jsonb(a) order by a.day_number,a.start_time,a.id) from public.trip_activities a where a.trip_id=t.id),'[]'::jsonb))
  from public.trips t where t.id=p_trip returning * into entry;
  return to_jsonb(entry);
end $$;

create function tripify_private.create_trip(p_data jsonb,p_display_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.trips; v jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  insert into public.trips(created_by,name,destination,start_date,end_date,timezone,currency,budget_total)
  values(auth.uid(),btrim(p_data->>'name'),btrim(p_data->>'destination'),(p_data->>'start_date')::date,(p_data->>'end_date')::date,p_data->>'timezone',p_data->>'currency',(p_data->>'budget_total')::numeric)
  returning * into t;
  insert into public.trip_members(trip_id,user_id,display_name) values(t.id,auth.uid(),btrim(p_display_name));
  v := tripify_private.record_version(t.id,'trip.created',t.name);
  return jsonb_build_object('trip',to_jsonb(t),'newVersion',t.version,'versionEntry',v);
end $$;

-- RPC-only updates are necessary so direct REST writes cannot skip the version
-- check. Row lock + check + entity mutation + history are ONE transaction.
create function tripify_private.mutate_trip(p_trip uuid,p_expected_version bigint,p_operation text,p_entity uuid,p_data jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.trips; a public.trip_activities; entity jsonb; entry jsonb; change text; summary text; before_state jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  select * into t from public.trips where id=p_trip for update;
  if not found or t.created_by <> auth.uid() then raise exception 'TRIP_FORBIDDEN' using errcode='42501'; end if;
  if p_expected_version is null or t.version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  if p_operation='trip.update' then
    if p_data - array['name','destination','start_date','end_date','timezone','currency','budget_total'] <> '{}'::jsonb then raise exception 'INVALID_FIELDS' using errcode='22023'; end if;
    before_state := to_jsonb(t);
    t := jsonb_populate_record(t,p_data);
    if to_jsonb(t) = before_state then raise exception 'NO_CHANGES' using errcode='22023'; end if;
    if exists(select 1 from public.trip_activities where trip_id=p_trip and day_number > t.end_date-t.start_date+1) then raise exception 'ACTIVITY_OUTSIDE_TRIP' using errcode='22023'; end if;
    update public.trips set name=t.name,destination=t.destination,start_date=t.start_date,end_date=t.end_date,timezone=t.timezone,currency=t.currency,budget_total=t.budget_total where id=p_trip;
    change := 'trip.updated'; summary := t.name;
  elsif p_operation in ('activity.add','activity.update','activity.remove') then
    if p_data - array['day_number','start_time','title','location_name','latitude','longitude','google_place_id','duration_minutes','estimated_cost'] <> '{}'::jsonb then raise exception 'INVALID_FIELDS' using errcode='22023'; end if;
    if p_operation <> 'activity.add' then
      select * into a from public.trip_activities where id=p_entity and trip_id=p_trip;
      if not found then raise exception 'ACTIVITY_NOT_FOUND' using errcode='22023'; end if;
    end if;
    if p_operation='activity.remove' then
      delete from public.trip_activities where id=a.id;
      change := 'activity.removed';
    else
      before_state := to_jsonb(a);
      a := jsonb_populate_record(a,p_data);
      if p_operation='activity.update' and to_jsonb(a) = before_state then raise exception 'NO_CHANGES' using errcode='22023'; end if;
      if a.day_number is null or a.day_number < 1 or a.day_number > t.end_date-t.start_date+1 then raise exception 'ACTIVITY_OUTSIDE_TRIP' using errcode='22023'; end if;
      if p_operation='activity.add' then
        insert into public.trip_activities(trip_id,day_number,start_time,title,location_name,latitude,longitude,google_place_id,duration_minutes,estimated_cost)
        values(p_trip,a.day_number,a.start_time,a.title,a.location_name,a.latitude,a.longitude,a.google_place_id,a.duration_minutes,coalesce(a.estimated_cost,0)) returning * into a;
        change := 'activity.added';
      else
        update public.trip_activities set day_number=a.day_number,start_time=a.start_time,title=a.title,location_name=a.location_name,latitude=a.latitude,longitude=a.longitude,google_place_id=a.google_place_id,duration_minutes=a.duration_minutes,estimated_cost=a.estimated_cost,updated_at=now()
        where id=a.id and trip_id=p_trip returning * into a;
        change := 'activity.updated';
      end if;
    end if;
    summary := a.title; entity := to_jsonb(a);
  else raise exception 'INVALID_OPERATION' using errcode='22023';
  end if;
  update public.trips set version=version+1,updated_at=now() where id=p_trip returning * into t;
  entry := tripify_private.record_version(p_trip,change,summary);
  return jsonb_build_object('newVersion',t.version,'updatedEntity',coalesce(entity,to_jsonb(t)),'versionEntry',entry);
end $$;

create function tripify_private.create_invite(p_trip uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare token text; invite public.trip_invites;
begin
  perform 1 from public.trips where id=p_trip and created_by=auth.uid() for update;
  if auth.uid() is null or not found then raise exception 'TRIP_FORBIDDEN' using errcode='42501'; end if;
  token := replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','');
  insert into public.trip_invites(trip_id,created_by,token_hash,expires_at)
  values(p_trip,auth.uid(),encode(sha256(convert_to(token,'UTF8')),'hex'),now()+interval '72 hours') returning * into invite;
  return jsonb_build_object('id',invite.id,'token',token,'expiresAt',invite.expires_at);
end $$;
create function tripify_private.accept_invite(p_token text,p_display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare invite public.trip_invites; target uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'INVITE_INVALID' using errcode='22023'; end if;
  select trip_id into target from public.trip_invites where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found then raise exception 'INVITE_INVALID' using errcode='22023'; end if;
  -- Lock order is always trip then invite, shared with removal and invite creation.
  perform 1 from public.trips where id=target for update;
  select * into invite from public.trip_invites where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
  if invite.accepted_at is not null then raise exception 'INVITE_USED' using errcode='22023'; end if;
  if invite.expires_at <= now() then raise exception 'INVITE_EXPIRED' using errcode='22023'; end if;
  if exists(select 1 from public.trip_members where trip_id=target and user_id=auth.uid()) then raise exception 'ALREADY_MEMBER' using errcode='22023'; end if;
  insert into public.trip_members(trip_id,user_id,display_name) values(target,auth.uid(),btrim(p_display_name));
  update public.trip_invites set accepted_at=now() where id=invite.id;
  return target;
end $$;
create function tripify_private.remove_member(p_trip uuid,p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.trips where id=p_trip and created_by=auth.uid() for update;
  if auth.uid() is null or not found then raise exception 'TRIP_FORBIDDEN' using errcode='42501'; end if;
  if p_user=auth.uid() then raise exception 'CREATOR_CANNOT_LEAVE' using errcode='22023'; end if;
  delete from public.trip_members where trip_id=p_trip and user_id=p_user;
end $$;
create function tripify_private.send_message(p_trip uuid,p_content text,p_client_message_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare message public.chat_messages;
begin
  -- Serialize with removal so a removed member cannot race a new send.
  perform 1 from public.trips where id=p_trip for share;
  if not tripify_private.can_read(p_trip) then raise exception 'TRIP_FORBIDDEN' using errcode='42501'; end if;
  if p_client_message_id is null then raise exception 'MESSAGE_ID_REQUIRED' using errcode='22023'; end if;
  insert into public.chat_messages(trip_id,user_id,content,client_message_id)
  values(p_trip,auth.uid(),btrim(p_content),p_client_message_id)
  on conflict(trip_id,user_id,client_message_id) do nothing returning * into message;
  if not found then
    select * into message from public.chat_messages where trip_id=p_trip and user_id=auth.uid() and client_message_id=p_client_message_id;
    if message.content <> btrim(p_content) then raise exception 'MESSAGE_ID_REUSED' using errcode='22023'; end if;
  end if;
  return to_jsonb(message);
end $$;

-- Public functions deliberately remain SECURITY INVOKER. Implementations are
-- callable only by authenticated and enforce auth.uid() internally, not UI state.
create function public.trip_create(p_data jsonb,p_display_name text) returns jsonb language sql security invoker set search_path='' as $$ select tripify_private.create_trip(p_data,p_display_name); $$;
create function public.trip_mutate(p_trip uuid,p_expected_version bigint,p_operation text,p_entity uuid,p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$ select tripify_private.mutate_trip(p_trip,p_expected_version,p_operation,p_entity,p_data); $$;
create function public.trip_invite_create(p_trip uuid) returns jsonb language sql security invoker set search_path='' as $$ select tripify_private.create_invite(p_trip); $$;
create function public.trip_invite_accept(p_token text,p_display_name text) returns uuid language sql security invoker set search_path='' as $$ select tripify_private.accept_invite(p_token,p_display_name); $$;
create function public.trip_member_remove(p_trip uuid,p_user uuid) returns void language sql security invoker set search_path='' as $$ select tripify_private.remove_member(p_trip,p_user); $$;
create function public.trip_chat_send(p_trip uuid,p_content text,p_client_message_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select tripify_private.send_message(p_trip,p_content,p_client_message_id); $$;

revoke all on all functions in schema tripify_private from public,anon,authenticated;
grant execute on function tripify_private.can_read(uuid),tripify_private.is_creator(uuid),tripify_private.create_trip(jsonb,text),tripify_private.mutate_trip(uuid,bigint,text,uuid,jsonb),tripify_private.create_invite(uuid),tripify_private.accept_invite(text,text),tripify_private.remove_member(uuid,uuid),tripify_private.send_message(uuid,text,uuid) to authenticated;
revoke all on function public.trip_create(jsonb,text),public.trip_mutate(uuid,bigint,text,uuid,jsonb),public.trip_invite_create(uuid),public.trip_invite_accept(text,text),public.trip_member_remove(uuid,uuid),public.trip_chat_send(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.trip_create(jsonb,text),public.trip_mutate(uuid,bigint,text,uuid,jsonb),public.trip_invite_create(uuid),public.trip_invite_accept(text,text),public.trip_member_remove(uuid,uuid),public.trip_chat_send(uuid,text,uuid) to authenticated;

-- No objects are created or modified inside Supabase's protected realtime schema.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.trips,public.trip_members,public.trip_activities,public.chat_messages;
  end if;
end $$;
commit;
