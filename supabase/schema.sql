-- =====================================================================
-- THƯ VIỆN LUẬT QUỐC TẾ - SUPABASE POSTGRES SCHEMA
-- Chạy an toàn nhiều lần (idempotent) trên SQL Editor của Supabase
-- =====================================================================

create extension if not exists pgcrypto;

-- 1. BẢNG PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

-- Hàm tạo dòng profiles khi có user mới trong auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := lower(trim(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))));
  insert into public.profiles (id, username, role)
  values (new.id, v_username, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Hàm kiểm tra quyền admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- 2. BẢNG TREATIES (Điều ước, Tập quán, Nguyên tắc pháp lý chung)
create table if not exists public.treaties (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) >= 1 and char_length(name) <= 300),
  category text not null check (category in ('Điều ước quốc tế', 'Tập quán quốc tế', 'Nguyên tắc pháp lý chung')),
  date_text text not null check (char_length(date_text) >= 1 and char_length(date_text) <= 300),
  content text not null check (char_length(content) >= 1 and char_length(content) <= 20000),
  tags text[] not null default '{}',
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. BẢNG CASES (Án lệ IRAC)
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) >= 1 and char_length(name) <= 300),
  court text not null check (char_length(court) >= 1 and char_length(court) <= 100),
  year int not null check (year >= 1500 and year <= 2100),
  facts text not null check (char_length(facts) >= 1 and char_length(facts) <= 20000),
  issues text not null check (char_length(issues) >= 1 and char_length(issues) <= 20000),
  holding text not null check (char_length(holding) >= 1 and char_length(holding) <= 20000),
  significance text not null check (char_length(significance) >= 1 and char_length(significance) <= 20000),
  tags text[] not null default '{}',
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. TRIGGER BEFORE UPDATE: tự cập nhật updated_at và giữ nguyên author_id
create or replace function public.handle_record_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.author_id := old.author_id;
  return new;
end;
$$;

drop trigger if exists trg_treaties_before_update on public.treaties;
create trigger trg_treaties_before_update
  before update on public.treaties
  for each row execute function public.handle_record_before_update();

drop trigger if exists trg_cases_before_update on public.cases;
create trigger trg_cases_before_update
  before update on public.cases
  for each row execute function public.handle_record_before_update();

-- 5. INDEX
create index if not exists idx_treaties_author_id on public.treaties(author_id);
create index if not exists idx_treaties_created_at_desc on public.treaties(created_at desc);

create index if not exists idx_cases_author_id on public.cases(author_id);
create index if not exists idx_cases_created_at_desc on public.cases(created_at desc);

-- 6. ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.treaties enable row level security;
alter table public.cases enable row level security;

-- Thu hồi quyền của anon để đảm bảo người chưa đăng nhập không truy cập được
revoke all on public.profiles from anon;
revoke all on public.treaties from anon;
revoke all on public.cases from anon;

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.treaties to authenticated;
grant select, insert, update, delete on public.cases to authenticated;

-- Policies cho profiles (chỉ select cho authenticated, không cho client tự insert/update/delete)
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Policies cho treaties
drop policy if exists "treaties_select_authenticated" on public.treaties;
create policy "treaties_select_authenticated"
  on public.treaties
  for select
  to authenticated
  using (true);

drop policy if exists "treaties_insert_own" on public.treaties;
create policy "treaties_insert_own"
  on public.treaties
  for insert
  to authenticated
  with check (author_id = auth.uid());

drop policy if exists "treaties_update_own_or_admin" on public.treaties;
create policy "treaties_update_own_or_admin"
  on public.treaties
  for update
  to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

drop policy if exists "treaties_delete_own_or_admin" on public.treaties;
create policy "treaties_delete_own_or_admin"
  on public.treaties
  for delete
  to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- Policies cho cases
drop policy if exists "cases_select_authenticated" on public.cases;
create policy "cases_select_authenticated"
  on public.cases
  for select
  to authenticated
  using (true);

drop policy if exists "cases_insert_own" on public.cases;
create policy "cases_insert_own"
  on public.cases
  for insert
  to authenticated
  with check (author_id = auth.uid());

drop policy if exists "cases_update_own_or_admin" on public.cases;
create policy "cases_update_own_or_admin"
  on public.cases
  for update
  to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

drop policy if exists "cases_delete_own_or_admin" on public.cases;
create policy "cases_delete_own_or_admin"
  on public.cases
  for delete
  to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- 7. HÀM NHẬP DỮ LIỆU HÀNG LOẠT public.import_batch(payload jsonb)
-- Chạy với quyền người gọi (security invoker) để RLS luôn được áp dụng
create or replace function public.import_batch(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid;
  v_treaties jsonb;
  v_cases jsonb;
  v_treaty_count int := 0;
  v_case_count int := 0;
  v_total int := 0;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Bạn cần đăng nhập để thực hiện nhập dữ liệu.';
  end if;

  v_treaties := coalesce(payload->'treaties', '[]'::jsonb);
  v_cases := coalesce(payload->'cases', '[]'::jsonb);

  if jsonb_typeof(v_treaties) <> 'array' or jsonb_typeof(v_cases) <> 'array' then
    raise exception 'Định dạng dữ liệu nhập không hợp lệ.';
  end if;

  v_total := jsonb_array_length(v_treaties) + jsonb_array_length(v_cases);
  if v_total < 1 then
    raise exception 'Phải có ít nhất 1 bài để nhập.';
  end if;
  if v_total > 200 then
    raise exception 'Mỗi lần nhập tối đa 200 bài.';
  end if;

  if jsonb_array_length(v_treaties) > 0 then
    insert into public.treaties (
      author_id,
      name,
      category,
      date_text,
      content,
      tags,
      sources
    )
    select
      v_uid,
      item->>'name',
      item->>'category',
      coalesce(item->>'date', item->>'date_text'),
      item->>'content',
      coalesce(
        array(select jsonb_array_elements_text(coalesce(item->'tags', '[]'::jsonb))),
        '{}'::text[]
      ),
      coalesce(item->'sources', '[]'::jsonb)
    from jsonb_array_elements(v_treaties) as item;

    get diagnostics v_treaty_count = row_count;
  end if;

  if jsonb_array_length(v_cases) > 0 then
    insert into public.cases (
      author_id,
      name,
      court,
      year,
      facts,
      issues,
      holding,
      significance,
      tags,
      sources
    )
    select
      v_uid,
      item->>'name',
      item->>'court',
      (item->>'year')::int,
      item->>'facts',
      item->>'issues',
      item->>'holding',
      item->>'significance',
      coalesce(
        array(select jsonb_array_elements_text(coalesce(item->'tags', '[]'::jsonb))),
        '{}'::text[]
      ),
      coalesce(item->'sources', '[]'::jsonb)
    from jsonb_array_elements(v_cases) as item;

    get diagnostics v_case_count = row_count;
  end if;

  return jsonb_build_object(
    'treaties_inserted', v_treaty_count,
    'cases_inserted', v_case_count,
    'total_inserted', v_treaty_count + v_case_count
  );
end;
$$;

revoke all on function public.import_batch(jsonb) from anon;
grant execute on function public.import_batch(jsonb) to authenticated;
