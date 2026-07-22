-- ArtSpace Gallery — structured artwork dimensions and size variants.
--
-- The free-text `artworks.dimensions` column is kept for display/back-compat,
-- but true-to-scale placement in "View in Your Space" needs machine-readable
-- sizes. Adds numeric width/height (centimetres) and a JSONB list of size
-- variants (each an offered size, optionally with its own price range).
--
-- RLS is unaffected: the existing artworks policies grant column-agnostic
-- read/write on the row, so new columns inherit them. No policy changes needed.

-- ---------------------------------------------------------------- columns

alter table public.artworks
  add column if not exists width_cm     numeric(7,2) check (width_cm  is null or width_cm  > 0),
  add column if not exists height_cm    numeric(7,2) check (height_cm is null or height_cm > 0),
  -- [{ "width_cm": 50, "height_cm": 40, "price_range": "$1,800 – $2,400" }, ...]
  add column if not exists size_variants jsonb not null default '[]'::jsonb;

-- Structural guard: size_variants must be a JSON array. Element shape is
-- validated in the application layer (queries.ts) where it is parsed.
alter table public.artworks
  drop constraint if exists artworks_size_variants_is_array;
alter table public.artworks
  add constraint artworks_size_variants_is_array
  check (jsonb_typeof(size_variants) = 'array');

-- ---------------------------------------------------------------- backfill

-- Parse the legacy free-text dimensions where it matches "<w> × <h>" (accepting
-- ×, x, or X and optional decimals/units). Rows that do not match are left null.
update public.artworks
set
  width_cm  = (regexp_match(dimensions, '([0-9]+(?:\.[0-9]+)?)\s*[×xX]\s*([0-9]+(?:\.[0-9]+)?)'))[1]::numeric,
  height_cm = (regexp_match(dimensions, '([0-9]+(?:\.[0-9]+)?)\s*[×xX]\s*([0-9]+(?:\.[0-9]+)?)'))[2]::numeric
where width_cm is null
  and dimensions ~ '[0-9]+(?:\.[0-9]+)?\s*[×xX]\s*[0-9]+(?:\.[0-9]+)?';

-- Seed a single base size variant from the parsed dimensions so the size
-- switcher has at least the as-listed size to offer.
update public.artworks
set size_variants = jsonb_build_array(
      jsonb_build_object(
        'width_cm',  width_cm,
        'height_cm', height_cm,
        'price_range', price_range
      )
    )
where width_cm is not null
  and height_cm is not null
  and size_variants = '[]'::jsonb;
