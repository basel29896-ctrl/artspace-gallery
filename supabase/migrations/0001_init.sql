-- ArtSpace Gallery — initial schema, RLS, triggers, storage buckets.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums

create type user_role   as enum ('artist', 'visitor');
create type plan_tier   as enum ('free', 'pro', 'premium');
create type inquiry_status as enum ('new', 'contacted', 'closed');
create type sub_status  as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

-- ---------------------------------------------------------------- users

create table public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       user_role not null default 'visitor',
  name       text,
  email      text not null,
  bio        text,
  avatar_url text,
  username   text unique
             check (username ~ '^[a-z0-9_]{3,30}$'),
  plan       plan_tier not null default 'free',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- artworks

create table public.artworks (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references public.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  description text,
  medium      text,
  dimensions  text,
  year        int check (year between 1000 and extract(year from now())::int + 1),
  price_range text,
  -- Storage object path in the PRIVATE `originals` bucket. Never sent to clients.
  original_url text not null,
  -- Storage object path in the PUBLIC `display` bucket (watermarked, max 1600px).
  display_url  text not null,
  likes_count  int not null default 0,
  created_at   timestamptz not null default now()
);

create index artworks_artist_id_created_at_idx
  on public.artworks (artist_id, created_at desc);
create index artworks_created_at_idx
  on public.artworks (created_at desc);

-- ---------------------------------------------------------------- likes

create table public.likes (
  user_id    uuid not null references public.users (id) on delete cascade,
  artwork_id uuid not null references public.artworks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artwork_id)
);

create index likes_artwork_id_idx on public.likes (artwork_id);

-- likes_count is derived state: maintained server-side only, never client-writable.
create or replace function public.sync_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.artworks set likes_count = likes_count + 1 where id = new.artwork_id;
  elsif tg_op = 'DELETE' then
    update public.artworks set likes_count = greatest(likes_count - 1, 0) where id = old.artwork_id;
  end if;
  return null;
end;
$$;

create trigger likes_sync_count
after insert or delete on public.likes
for each row execute function public.sync_likes_count();

-- ---------------------------------------------------------------- inquiries

create table public.inquiries (
  id          uuid primary key default gen_random_uuid(),
  artwork_id  uuid not null references public.artworks (id) on delete cascade,
  artist_id   uuid not null references public.users (id) on delete cascade,
  buyer_name  text not null check (char_length(buyer_name) between 1 and 120),
  buyer_phone text not null check (char_length(buyer_phone) between 5 and 32),
  message     text not null check (char_length(message) between 1 and 2000),
  status      inquiry_status not null default 'new',
  created_at  timestamptz not null default now()
);

create index inquiries_artist_id_created_at_idx
  on public.inquiries (artist_id, created_at desc);

-- ---------------------------------------------------------------- subscriptions

create table public.subscriptions (
  user_id            uuid primary key references public.users (id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_sub_id      text unique,
  plan               plan_tier not null default 'free',
  status             sub_status not null default 'incomplete',
  current_period_end timestamptz,
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------- new-user hook

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------- RLS

alter table public.users         enable row level security;
alter table public.artworks      enable row level security;
alter table public.likes         enable row level security;
alter table public.inquiries     enable row level security;
alter table public.subscriptions enable row level security;

-- users: profiles are public reads; you may only edit your own row.
create policy users_select_all on public.users
  for select using (true);

create policy users_update_own on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Guard: role and plan are privileged columns. A user must not escalate
-- themselves to 'artist' or to a paid plan by updating their own row.
create or replace function public.guard_privileged_user_columns()
returns trigger
language plpgsql
as $$
begin
  -- service_role bypasses RLS entirely and has auth.uid() = null; let it through.
  if auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role then
    raise exception 'role cannot be changed by the user';
  end if;
  if new.plan is distinct from old.plan then
    raise exception 'plan cannot be changed by the user';
  end if;
  return new;
end;
$$;

create trigger users_guard_privileged
before update on public.users
for each row execute function public.guard_privileged_user_columns();

-- artworks: world-readable; writable only by the owning artist.
create policy artworks_select_all on public.artworks
  for select using (true);

create policy artworks_insert_own on public.artworks
  for insert with check (
    auth.uid() = artist_id
    and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'artist')
  );

create policy artworks_update_own on public.artworks
  for update using (auth.uid() = artist_id) with check (auth.uid() = artist_id);

create policy artworks_delete_own on public.artworks
  for delete using (auth.uid() = artist_id);

-- likes: readable by all (counts), writable only as yourself.
create policy likes_select_all on public.likes
  for select using (true);

create policy likes_insert_own on public.likes
  for insert with check (auth.uid() = user_id);

create policy likes_delete_own on public.likes
  for delete using (auth.uid() = user_id);

-- inquiries: contain buyer PII. Readable ONLY by the receiving artist.
-- Inserts go through the server route (service_role), not the browser.
create policy inquiries_select_own_artist on public.inquiries
  for select using (auth.uid() = artist_id);

create policy inquiries_update_own_artist on public.inquiries
  for update using (auth.uid() = artist_id) with check (auth.uid() = artist_id);

-- subscriptions: readable by owner; written only by the Stripe webhook (service_role).
create policy subscriptions_select_own on public.subscriptions
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------- storage

-- `originals` is PRIVATE. No select policy for anon/authenticated is granted here,
-- so originals are reachable only via service_role or a signed URL minted server-side.
insert into storage.buckets (id, name, public)
values ('originals', 'originals', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('display', 'display', true)
on conflict (id) do nothing;

-- Uploads are performed server-side with service_role, so no INSERT policies are
-- granted to end users on either bucket. Artists may read their OWN originals
-- (path convention: <artist_id>/<artwork_id>.<ext>).
create policy originals_select_own on storage.objects
  for select using (
    bucket_id = 'originals'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
