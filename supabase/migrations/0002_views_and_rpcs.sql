-- Phase 3: view analytics, like toggling, and inquiry intake.

-- ---------------------------------------------------------------- views

alter table public.artworks
  add column if not exists views_count int not null default 0;

/**
 * Deduplicated per (artwork, viewer, day). `viewer_hash` is a salted digest of
 * IP + user agent computed in the app layer — we never store a raw IP, so this
 * is analytics rather than a tracking log.
 */
create table public.artwork_views (
  artwork_id  uuid not null references public.artworks (id) on delete cascade,
  viewer_hash text not null,
  viewed_on   date not null default current_date,
  primary key (artwork_id, viewer_hash, viewed_on)
);

create index artwork_views_artwork_idx on public.artwork_views (artwork_id);

alter table public.artwork_views enable row level security;
-- No policies: reachable only via the SECURITY DEFINER function below and by
-- service_role. Raw view rows are never client-readable.

create or replace function public.record_artwork_view(p_artwork_id uuid, p_viewer_hash text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.artwork_views (artwork_id, viewer_hash)
  values (p_artwork_id, p_viewer_hash)
  on conflict do nothing;

  -- Only bump the denormalized counter when the insert was actually new.
  if found then
    update public.artworks
       set views_count = views_count + 1
     where id = p_artwork_id;
  end if;
end;
$$;

revoke all on function public.record_artwork_view(uuid, text) from public;
grant execute on function public.record_artwork_view(uuid, text) to service_role;

-- ---------------------------------------------------------------- purge old view rows

/**
 * artwork_views grows without bound otherwise. views_count is the durable
 * number; the per-day rows exist only to dedupe, so 90 days is plenty.
 * Schedule via pg_cron: select cron.schedule('purge-views','0 4 * * *','select public.purge_old_artwork_views()');
 */
create or replace function public.purge_old_artwork_views()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.artwork_views where viewed_on < current_date - interval '90 days';
$$;

-- ---------------------------------------------------------------- inquiry intake

/**
 * `inquiries` has no INSERT policy, so buyers cannot write to it directly.
 * This runs as the definer to accept a submission while keeping the table
 * otherwise sealed. artist_id is derived from the artwork, never from the
 * client — otherwise a buyer could address an inquiry to an arbitrary artist.
 */
create or replace function public.submit_inquiry(
  p_artwork_id  uuid,
  p_buyer_name  text,
  p_buyer_phone text,
  p_message     text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_artist_id uuid;
  v_id uuid;
begin
  select artist_id into v_artist_id from public.artworks where id = p_artwork_id;
  if v_artist_id is null then
    raise exception 'artwork not found';
  end if;

  insert into public.inquiries (artwork_id, artist_id, buyer_name, buyer_phone, message)
  values (p_artwork_id, v_artist_id, p_buyer_name, p_buyer_phone, p_message)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_inquiry(uuid, text, text, text) from public;
grant execute on function public.submit_inquiry(uuid, text, text, text) to service_role;

-- ---------------------------------------------------------------- artist stats

/** Per-artwork analytics for the dashboard. Returns only the caller's own work. */
create or replace function public.artist_artwork_stats()
returns table (
  artwork_id uuid,
  title text,
  views_count int,
  likes_count int,
  inquiries_count bigint,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select a.id,
         a.title,
         a.views_count,
         a.likes_count,
         (select count(*) from public.inquiries i where i.artwork_id = a.id),
         a.created_at
    from public.artworks a
   where a.artist_id = auth.uid()
   order by a.created_at desc;
$$;
