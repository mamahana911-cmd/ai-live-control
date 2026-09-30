-- Jalankan di Supabase SQL Editor.
-- Auth user dibuat oleh Supabase Auth; trigger di bawah membuat profile otomatis.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text unique,
 display_name text not null default 'User',
 role text not null default 'user' check (role in ('admin','user')),
 plan text not null default 'PRO',
 active boolean not null default true,
 created_at timestamptz not null default now()
);

create table if not exists public.videos (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 name text not null,
 storage_path text not null unique,
 mime_type text,
 size_bytes bigint,
 created_at timestamptz not null default now()
);

create table if not exists public.triggers (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 event_type text not null check(event_type in ('comment','gift','boss')),
 event_value text not null,
 video_id uuid references public.videos(id) on delete set null,
 enabled boolean not null default true,
 priority int not null default 0,
 created_at timestamptz not null default now()
);

create table if not exists public.live_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'offline',
 viewer_count int not null default 0,
 comment_count int not null default 0,
 gift_count int not null default 0,
 diamonds bigint not null default 0,
 updated_at timestamptz not null default now()
);

create table if not exists public.event_logs (
 id bigint generated always as identity primary key,
 user_id uuid not null references public.profiles(id) on delete cascade,
 event_type text not null,
 event_value text,
 diamonds int not null default 0,
 created_at timestamptz not null default now()
);

create table if not exists public.licenses (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references public.profiles(id) on delete cascade,
 license_key text unique not null,
 plan text not null default 'PRO',
 expires_at timestamptz,
 max_devices int not null default 2,
 active boolean not null default true,
 created_at timestamptz not null default now()
);

-- Profile otomatis saat signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path=public
as $$
begin
  insert into public.profiles(id,email,display_name)
  values(new.id,new.email,coalesce(split_part(new.email,'@',1),'User'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.triggers enable row level security;
alter table public.live_sessions enable row level security;
alter table public.event_logs enable row level security;
alter table public.licenses enable row level security;

drop policy if exists profile_self on public.profiles;
create policy profile_self on public.profiles for all using(auth.uid()=id) with check(auth.uid()=id);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path=public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id=auth.uid() and role='admin' and active=true
  );
$$;

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select on public.profiles
for select to authenticated
using(auth.uid()=id or public.is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
for update to authenticated
using(auth.uid()=id or public.is_admin())
with check(auth.uid()=id or public.is_admin());

drop policy if exists videos_self on public.videos;
create policy videos_self on public.videos for all using(auth.uid()=user_id) with check(auth.uid()=user_id);

drop policy if exists triggers_self on public.triggers;
create policy triggers_self on public.triggers for all using(auth.uid()=user_id) with check(auth.uid()=user_id);

drop policy if exists sessions_self on public.live_sessions;
create policy sessions_self on public.live_sessions for all using(auth.uid()=user_id) with check(auth.uid()=user_id);

drop policy if exists logs_self on public.event_logs;
create policy logs_self on public.event_logs for all using(auth.uid()=user_id) with check(auth.uid()=user_id);

drop policy if exists licenses_self on public.licenses;
create policy licenses_self on public.licenses for select using(auth.uid()=user_id);

-- Storage bucket.
insert into storage.buckets(id,name,public)
values('videos','videos',false)
on conflict(id) do update set public=false;

drop policy if exists video_upload_own on storage.objects;
create policy video_upload_own on storage.objects for insert to authenticated
with check(bucket_id='videos' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists video_read_own on storage.objects;
create policy video_read_own on storage.objects for select to authenticated
using(bucket_id='videos' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists video_delete_own on storage.objects;
create policy video_delete_own on storage.objects for delete to authenticated
using(bucket_id='videos' and (storage.foldername(name))[1]=auth.uid()::text);

-- PENTING:
-- Untuk produksi, admin management jangan mengandalkan RLS sederhana di frontend.
-- Gunakan Edge Function/server-side untuk aksi admin dan validasi license.
