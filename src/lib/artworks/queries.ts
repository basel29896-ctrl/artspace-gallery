import { createClient } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/env';
import {
  fixturesEnabled,
  fixtureArtistList,
  fixtureArtist,
  fixtureArtwork,
  fixtureSpaceArtworks,
  FIXTURE_ARTWORKS,
} from './fixtures';

export type GalleryArtwork = {
  id: string;
  title: string;
  description: string | null;
  medium: string | null;
  year: number | null;
  likes_count: number;
  displayUrl: string;
  artist: { id: string; name: string | null; username: string | null };
};

/** `display` is a public bucket, so its objects resolve to a stable CDN URL. */
export function displayPublicUrl(path: string) {
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/display/${path}`;
}

export type ArtistProfile = {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
};

/** Public artist profile plus their full body of work. */
export async function getArtistByUsername(username: string) {
  if (fixturesEnabled()) return fixtureArtist(username);

  const supabase = createClient();

  const { data: artist } = await supabase
    .from('users')
    .select('id, name, username, bio, avatar_url')
    .eq('username', username)
    .maybeSingle();

  if (!artist) return null;

  const { data: rows } = await supabase
    .from('artworks')
    .select('id, title, description, medium, year, likes_count, display_url')
    .eq('artist_id', artist.id)
    .order('created_at', { ascending: false });

  const artworks: GalleryArtwork[] = (rows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    medium: row.medium,
    year: row.year,
    likes_count: row.likes_count,
    displayUrl: displayPublicUrl(row.display_url),
    artist: { id: artist.id, name: artist.name, username: artist.username },
  }));

  return { artist: artist as ArtistProfile, artworks };
}

/** Single artwork for the lightbox route. */
export async function getArtwork(id: string) {
  if (fixturesEnabled()) return fixtureArtwork(id);

  const supabase = createClient();

  const { data } = await supabase
    .from('artworks')
    .select(
      'id, title, description, medium, dimensions, year, price_range, likes_count, views_count, display_url, users!artworks_artist_id_fkey (id, name, username, avatar_url)',
    )
    .eq('id', id)
    .maybeSingle();

  if (!data) return null;

  const artist = Array.isArray(data.users) ? data.users[0] : data.users;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    medium: data.medium,
    dimensions: data.dimensions,
    year: data.year,
    price_range: data.price_range,
    likes_count: data.likes_count,
    views_count: data.views_count,
    displayUrl: displayPublicUrl(data.display_url),
    artist: {
      id: artist?.id ?? '',
      name: artist?.name ?? null,
      username: artist?.username ?? null,
      avatar_url: artist?.avatar_url ?? null,
    },
  };
}

export type ArtworkDetail = NonNullable<Awaited<ReturnType<typeof getArtwork>>>;

export type SpaceArtwork = {
  id: string;
  title: string;
  displayUrl: string;
  artistName: string | null;
};

/**
 * The chosen artwork plus up to four more by the same artist, for the
 * "View in Your Space" switcher. The chosen piece is always first.
 */
export async function getSpaceArtworks(artworkId: string): Promise<SpaceArtwork[]> {
  if (fixturesEnabled()) return fixtureSpaceArtworks(artworkId);

  const supabase = createClient();

  const { data: current } = await supabase
    .from('artworks')
    .select('id, title, display_url, artist_id, users!artworks_artist_id_fkey (name, username)')
    .eq('id', artworkId)
    .maybeSingle();

  if (!current) return [];

  const artist = Array.isArray(current.users) ? current.users[0] : current.users;
  const artistName = artist?.name ?? artist?.username ?? null;

  const { data: siblings } = await supabase
    .from('artworks')
    .select('id, title, display_url')
    .eq('artist_id', current.artist_id)
    .neq('id', artworkId)
    .order('likes_count', { ascending: false })
    .limit(4);

  return [
    {
      id: current.id,
      title: current.title,
      displayUrl: displayPublicUrl(current.display_url),
      artistName,
    },
    ...(siblings ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      displayUrl: displayPublicUrl(row.display_url),
      artistName,
    })),
  ];
}

/**
 * Top artworks for the gallery room. `created_at` is the tiebreaker so the wall
 * order is stable between renders when several pieces share a like count.
 */
export async function getTopArtworks(limit = 10): Promise<GalleryArtwork[]> {
  if (fixturesEnabled()) return FIXTURE_ARTWORKS.slice(0, limit);

  const supabase = createClient();

  const { data, error } = await supabase
    .from('artworks')
    .select(
      'id, title, description, medium, year, likes_count, display_url, users!artworks_artist_id_fkey (id, name, username)',
    )
    .order('likes_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    // A failed gallery fetch should render an empty room, not a 500.
    console.error('[gallery] failed to load top artworks', error);
    return [];
  }

  return (data ?? []).map((row) => {
    const artist = Array.isArray(row.users) ? row.users[0] : row.users;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      medium: row.medium,
      year: row.year,
      likes_count: row.likes_count,
      displayUrl: displayPublicUrl(row.display_url),
      artist: {
        id: artist?.id ?? '',
        name: artist?.name ?? null,
        username: artist?.username ?? null,
      },
    };
  });
}

export type ArtistSummary = {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  artworkCount: number;
  coverUrl: string | null;
};

/** Directory of artists who have published at least one work. */
export async function getArtists(): Promise<ArtistSummary[]> {
  if (fixturesEnabled()) return fixtureArtistList();

  const supabase = createClient();

  const { data, error } = await supabase
    .from('users')
    .select('id, name, username, bio, avatar_url, artworks (id, display_url, likes_count)')
    .eq('role', 'artist')
    .not('username', 'is', null);

  if (error) {
    console.error('[artists] list failed', error);
    return [];
  }

  return (data ?? [])
    .map((row) => {
      const works = Array.isArray(row.artworks) ? row.artworks : [];
      // Cover is the artist's most-liked piece, so the directory shows their best.
      const cover = [...works].sort((a, b) => b.likes_count - a.likes_count)[0];
      return {
        id: row.id,
        name: row.name,
        username: row.username,
        bio: row.bio,
        avatar_url: row.avatar_url,
        artworkCount: works.length,
        coverUrl: cover ? displayPublicUrl(cover.display_url) : null,
      };
    })
    .filter((a) => a.artworkCount > 0)
    .sort((a, b) => b.artworkCount - a.artworkCount);
}
