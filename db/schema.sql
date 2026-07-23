-- ArtSpace — plain PostgreSQL schema for Heroku Postgres.
--
-- This is the Supabase migrations (supabase/migrations/0001-0004) translated to
-- a standalone Postgres database:
--   • No Supabase `auth.users` — identity lives in this `users` table, with a
--     `password_hash` for NextAuth's Credentials provider (+ nullable for OAuth).
--   • No Row Level Security / storage buckets — access control moves to the app
--     layer (NextAuth session + server routes); image files move to object
--     storage (S3/Cloudinary), so only the object URL/key is stored here.
--
-- Run manually against your database, e.g.:
--   heroku pg:psql --app <app> < db/schema.sql
-- Safe to re-run: everything is IF NOT EXISTS / idempotent.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums
do $$ begin
  create type user_role as enum ('artist', 'gallery', 'visitor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_tier as enum ('free', 'pro', 'premium');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inquiry_status as enum ('new', 'contacted', 'closed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- users
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  role          user_role   not null default 'visitor',
  name          text,
  email         text        not null unique,
  -- bcrypt/argon hash for the Credentials provider; null for OAuth-only accounts.
  password_hash text,
  bio           text,
  avatar_url    text,
  website       text        check (website is null or char_length(website) <= 200),
  instagram     text        check (instagram is null or char_length(instagram) <= 60),
  username      text unique check (username is null or username ~ '^[a-z0-9_]{3,30}$'),
  plan          plan_tier   not null default 'free',
  -- Manual onboarding: operator flips this true after payment (no online pay in JO yet).
  is_approved   boolean     not null default false,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------- artworks
create table if not exists artworks (
  id           uuid primary key default gen_random_uuid(),
  artist_id    uuid not null references users (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  description  text,
  medium       text,
  dimensions   text,
  year         int check (year between 1000 and extract(year from now())::int + 1),
  price_range  text,
  width_cm     numeric(7,2) check (width_cm  is null or width_cm  > 0),
  height_cm    numeric(7,2) check (height_cm is null or height_cm > 0),
  size_variants jsonb not null default '[]'::jsonb
                check (jsonb_typeof(size_variants) = 'array'),
  -- Object-storage key/URL for the private original and public display image.
  original_url text not null,
  display_url  text not null,
  likes_count  int  not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists artworks_artist_id_created_at_idx on artworks (artist_id, created_at desc);
create index if not exists artworks_created_at_idx on artworks (created_at desc);

-- ---------------------------------------------------------------- likes
create table if not exists likes (
  user_id    uuid not null references users (id) on delete cascade,
  artwork_id uuid not null references artworks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artwork_id)
);
create index if not exists likes_artwork_id_idx on likes (artwork_id);

-- likes_count stays derived: maintained by trigger, never written by the client.
create or replace function sync_likes_count() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update artworks set likes_count = likes_count + 1 where id = new.artwork_id;
  elsif tg_op = 'DELETE' then
    update artworks set likes_count = greatest(likes_count - 1, 0) where id = old.artwork_id;
  end if;
  return null;
end $$;

drop trigger if exists likes_sync_count on likes;
create trigger likes_sync_count
  after insert or delete on likes
  for each row execute function sync_likes_count();

-- ---------------------------------------------------------------- inquiries
create table if not exists inquiries (
  id          uuid primary key default gen_random_uuid(),
  artwork_id  uuid not null references artworks (id) on delete cascade,
  artist_id   uuid not null references users (id) on delete cascade,
  buyer_name  text not null check (char_length(buyer_name) between 1 and 120),
  buyer_phone text not null check (char_length(buyer_phone) between 5 and 32),
  message     text not null check (char_length(message) between 1 and 2000),
  status      inquiry_status not null default 'new',
  created_at  timestamptz not null default now()
);
create index if not exists inquiries_artist_id_created_at_idx on inquiries (artist_id, created_at desc);

-- ---------------------------------------------------------------- access requests
-- The manual "Request access" flow can land in the DB instead of (or as well as)
-- email once the app is on Heroku.
create table if not exists access_requests (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  role       user_role not null default 'artist',
  message    text,
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);
