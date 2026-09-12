-- Tripify / Stage 1 数据结构设计 / 2026-09-11
-- 状态：设计草案，不是已部署 schema，也不是可直接应用的 migration。
-- 本文件全部为注释：执行本文件不会创建或修改任何表。
-- 当前页面数据仅在 React 内存中；刷新即清空。远程 Supabase 本轮新增 0 张表。
-- 依据：实现方案 §§12–17、24–36、43–47；本次要求“页面先行，按需建表”。
--
-- 第一批建议只有 3 张业务表：
--   trips           行程卡片、创建表单、工作台 header、预算上限。
--   trip_members    成员列表 + 每个成员在这次旅行中的偏好（一对一先合并）。
--   trip_activities 每个活动一行，支持逐项修改；不把整个 itinerary 存 JSON。
-- 身份仍由 auth.users 管理，不新增重复的 users 表，不复制 email/password/token。
--
-- 页面 -> 存储映射：
-- Trip.start/end/budget/timezone -> trips.start_date/end_date/budget_total/timezone
-- Member.id -> trip_members.user_id（正式接入时换成真实 Auth UUID，不保存 me/charlie）
-- Member.name -> trip_members.display_name（行程内称呼，不作为权限依据）
-- Member.food/budget -> trip_members.food_preferences/budget_limit
-- Activity.day/time/place/cost/duration -> day_number/start_time/location_name/
--                                        estimated_cost/duration_minutes
-- Activity.x/y 是演示图百分比坐标，不能当经纬度写入数据库。
-- Trip.demo、临时提示、搜索词、选中活动、当前 tab、示例天气也不入库。

/*
-- 下列 DDL 仅供审阅。上线前必须完成文末的权限、事务和测试清单。

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  destination text not null check (char_length(btrim(destination)) between 1 and 120),
  start_date date not null,
  end_date date not null,
  timezone text not null, -- IANA 时区；写入端须校验 pg_timezone_names 中存在。
  currency text not null check (currency in ('MYR', 'USD', 'JPY', 'CNY', 'SGD', 'EUR')),
  budget_total numeric(12,2) not null check (budget_total >= 0),
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- version 是实现方案 §17 指定的冲突检测字段，而不是装饰状态。
-- 后端写操作须原子校验旧 version 并递增；当前未实现这些写操作。
-- created_by 表示创建者，不能被普通成员改写。最终权限不从 user_metadata 读取。
-- 本地表单 1–60 天为预览边界，不把它当成已确认的永久产品限制。

create table public.trip_members (
  trip_id uuid not null references public.trips(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 100),
  interests text not null default '' check (char_length(interests) <= 400),
  dislikes text not null default '' check (char_length(dislikes) <= 400),
  food_preferences text not null default '' check (char_length(food_preferences) <= 400),
  pace text not null default 'balanced' check (pace in ('slow', 'balanced', 'active')),
  budget_limit numeric(12,2) check (budget_limit >= 0), -- null=未填写；0=明确为零。
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

-- 不单独建 trip_preferences：当前每个成员/行程只有一组简单偏好。
-- 当需要偏好历史、独立隐私权限或多套偏好时，再拆表。
-- 不提前设计邀请 token、管理员 role、组织、权限矩阵等字段。
-- 用户称呼可来自已验证身份的显示资料，但绝不能用于授权判断。

create table public.trip_activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete restrict,
  day_number smallint not null check (day_number > 0),
  start_time time(0) without time zone not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  location_name text not null check (char_length(btrim(location_name)) between 1 and 200),
  duration_minutes smallint not null check (duration_minutes between 1 and 1440),
  estimated_cost numeric(12,2) not null default 0 check (estimated_cost >= 0)
);

-- 日期由 start_date + day_number - 1 派生，不同时保存 day/date 两份可漂移的数据。
-- start_time 是目的地本地钟表时间，不能直接当 UTC；跨日/DST 转换由写入端处理。
-- 按 (day_number, start_time, id) 确定顺序；当前不提供拖拽，因此不加 position。
-- 活动逐条保存，不加 metadata 万能 JSON；描述、预订链接、坐标有真实 UI 再加。

create index trips_creator_idx on public.trips (created_by, created_at desc);
create index trip_members_user_idx on public.trip_members (user_id, trip_id);
create index trip_activities_timeline_idx
  on public.trip_activities (trip_id, day_number, start_time, id);

-- 安全基线（同样只是草案）：默认拒绝，不发布任何读写 API。
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_activities enable row level security;
revoke all on public.trips, public.trip_members, public.trip_activities
  from public, anon, authenticated, service_role;
-- 不创建 permissive policy，不为解决权限错误引入 SECURITY DEFINER。
-- 这不是“可用的 RLS 实现”：明确禁用访问，等待业务权限确认与独立测试。
*/

-- 不需要落库的派生值：
--   行程天数 = end_date - start_date + 1
--   成员数量 = count(trip_members)
--   已排活动估算 = sum(trip_activities.estimated_cost)，币种取 trips.currency
--   剩余额度 = budget_total - 已排活动估算（可为负，不隐藏超额）
--   预测值/组适配分/步行距离：当前只是样例，不保存假 AI 输出。
--   budget_total 是团队总额，budget_limit 是个人偏好，不能重复求和充当支出。

-- 后续按真实功能逐批增加（此处仅记录触发条件，不建空表）：
-- 1. 真实共享讨论上线 -> chat_messages；需要发送者、时间、权限与幂等发送。
-- 2. 真实 Human-in-the-loop -> proposals / proposal_changes / proposal_votes；
--    必须一起设计 base_trip_version、审批规则、唯一投票、原子应用和冲突恢复。
--    页面里 4/4 的示例不是最终投票规则；AI 不能绕过审批直接更新活动。
-- 3. 真实地理服务 -> 活动坐标/地图提供商引用；先无地图缓存/路线表。
-- 4. Observer、研究溯源、撤销历史真正需要时，才讨论 events/sources/snapshots。
-- 不建支付、订票、分账、向量库、独立预算汇总、全局用户偏好等超出本阶段的表。

-- 转成 migration 前的必做项（这轮未执行，不能当已验证上线）：
-- [ ] 确认成员读取偏好的范围、谁能编辑活动/邀请/移除成员、创建者离开后的规则。
-- [ ] 确认删除/保留政策；目前 FK RESTRICT 只作保护，不提供删除功能。
-- [ ] 确认全新项目还是已有同名表，先只读检查；绝不覆盖已有数据。
-- [ ] 明确 RLS SELECT/INSERT/UPDATE 的 USING + WITH CHECK、列级可修改范围，
--     以及显式最小 GRANT；测试 A/B 两组互不可见、成员不能自加进另一行程。
-- [ ] 原子创建 trip + 创建者 membership；原子修改 activity + version/updated_at。
-- [ ] 在事务中校验 day_number 在行程日期范围内；修改日期不能留下越界活动。
-- [ ] 服务端校验 IANA timezone、金额上界/精度、长度、身份；前端仅辅助校验。
-- [ ] 写入前保留版本比较；并发修改失败返回可恢复的冲突，不静默覆盖。
-- [ ] 本地 Postgres 约束/RLS/并发测试 + Supabase advisors；再由 CLI 生成 migration。
-- [ ] 授权后才应用远程；接入成功前，页面继续保留“内存预览”提示。
--
-- 参考（核对于 2026-09-11）：
-- https://supabase.com/docs/guides/api/securing-your-api
-- https://supabase.com/docs/guides/database/postgres/row-level-security
-- https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
-- GRANT 决定表能否被访问，RLS 决定哪些行能访问，必须分别设计和验证。
