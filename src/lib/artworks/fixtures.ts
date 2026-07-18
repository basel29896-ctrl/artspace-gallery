import type { GalleryArtwork, SpaceArtwork, ArtistProfile } from './queries';

/**
 * Local sample data for verifying the UI without a Supabase project.
 *
 * Double-gated: the flag must be set AND the build must not be production.
 * This exists so visual work can be exercised offline; it must never be a code
 * path a real user can reach.
 */
export function fixturesEnabled() {
  return process.env.NEXT_PUBLIC_USE_FIXTURES === '1' && process.env.NODE_ENV !== 'production';
}

const ARTISTS: ArtistProfile[] = [
  {
    id: 'artist-mira',
    name: 'Mira Okonkwo',
    username: 'mira_okonkwo',
    bio: 'Illustrator and naturalist working in gouache. Entomological plates painted from museum drawers, alongside quieter domestic scenes. Lives between Lagos and Lisbon.',
    avatar_url: null,
  },
  {
    id: 'artist-elias',
    name: 'Elias Ward',
    username: 'elias_ward',
    bio: 'Photographer documenting the spaces where art is made and shown — studios at the end of a working day, galleries an hour before opening.',
    avatar_url: null,
  },
  {
    id: 'artist-nadia',
    name: 'Nadia Ferrante',
    username: 'nadia_ferrante',
    bio: 'Painter. Poured acrylic and oil on panel, built up over months until the surface stops moving.',
    avatar_url: null,
  },
];

type Seed = {
  id: string;
  title: string;
  medium: string;
  year: number;
  likes: number;
  dimensions: string;
  price: string;
  artist: string;
  description: string;
};

const SEEDS: Seed[] = [
  {
    id: 'a1', artist: 'nadia_ferrante', title: 'Fluid Cartography', medium: 'Poured acrylic on panel',
    year: 2023, likes: 312, dimensions: '150 × 120 cm', price: '$7,400 – $9,000',
    description:
      'Twenty-two pours, each left to skin over before the next. The map is not of anywhere; it is the record of how long the paint was allowed to move.',
  },
  {
    id: 'a2', artist: 'elias_ward', title: 'Two Figures, Midday', medium: 'Archival pigment print',
    year: 2022, likes: 268, dimensions: '90 × 60 cm', price: '$1,200 – $1,600',
    description:
      'Shot from below at the hour when the sky goes flat and the stone loses all its shadow. One figure greets something out of frame; the other has already looked away.',
  },
  {
    id: 'a3', artist: 'nadia_ferrante', title: 'Wet Edge', medium: 'Photograph, studio series',
    year: 2024, likes: 194, dimensions: '60 × 45 cm', price: '$700 – $900',
    description:
      'The last ten minutes of a working session, when the edge is still open and a decision can still be taken back.',
  },
  {
    id: 'a4', artist: 'elias_ward', title: 'Opening Night', medium: 'Archival pigment print',
    year: 2023, likes: 176, dimensions: '75 × 50 cm', price: '$900 – $1,300',
    description:
      'A long exposure taken an hour into a private view. The work stays sharp; everyone who came to see it does not.',
  },
  {
    id: 'a5', artist: 'elias_ward', title: 'Palette, No. 4', medium: 'Archival pigment print',
    year: 2023, likes: 151, dimensions: '60 × 45 cm', price: '$700 – $900',
    description:
      'Fourth in a series photographing palettes at the end of a commission — the leftover colour of a finished painting.',
  },
  {
    id: 'a6', artist: 'mira_okonkwo', title: 'Snow Under Lamplight', medium: 'Digital illustration',
    year: 2021, likes: 289, dimensions: '70 × 90 cm', price: '$800 – $1,100',
    description:
      'One street lamp, one figure, and roughly nine thousand flakes placed by hand. Drawn the winter the trains stopped running.',
  },
  {
    id: 'a7', artist: 'mira_okonkwo', title: 'Urania, Green', medium: 'Gouache on paper',
    year: 2024, likes: 341, dimensions: '50 × 40 cm', price: '$1,800 – $2,400',
    description:
      'Painted from a specimen drawer at the natural history museum. The green is not pigment on the wing but structure — it changes with the angle you stand at, which gouache cannot do, so the painting settles for one honest position.',
  },
  {
    id: 'a8', artist: 'mira_okonkwo', title: 'Tiger Moth', medium: 'Gouache on paper',
    year: 2024, likes: 327, dimensions: '50 × 40 cm', price: '$1,800 – $2,400',
    description:
      'Companion to Urania. The warning colours are accurate; the symmetry is not, and was corrected only where the eye insisted.',
  },
  {
    id: 'a9', artist: 'mira_okonkwo', title: 'Winter Window', medium: 'Digital illustration',
    year: 2022, likes: 223, dimensions: '80 × 60 cm', price: '$800 – $1,100',
    description:
      'Two people, one chair, and the particular warmth of a room that is only warm because it is cold outside.',
  },
  {
    id: 'a10', artist: 'elias_ward', title: 'Night Work', medium: 'Archival pigment print',
    year: 2024, likes: 205, dimensions: '100 × 67 cm', price: '$1,100 – $1,500',
    description:
      'A single bulb, a brush, and the part of the canvas the photographer was asked not to show.',
  },
];

function artistByUsername(username: string) {
  return ARTISTS.find((a) => a.username === username) ?? ARTISTS[0];
}

function toGalleryArtwork(seed: Seed): GalleryArtwork {
  const artist = artistByUsername(seed.artist);
  return {
    id: seed.id,
    title: seed.title,
    description: seed.description,
    medium: seed.medium,
    year: seed.year,
    likes_count: seed.likes,
    displayUrl: `/fixtures/${seed.id}.webp`,
    artist: { id: artist.id, name: artist.name, username: artist.username },
  };
}

/** Sorted by likes, mirroring the real `getTopArtworks` ordering. */
export const FIXTURE_ARTWORKS: GalleryArtwork[] = SEEDS.map(toGalleryArtwork).sort(
  (a, b) => b.likes_count - a.likes_count,
);

export function fixtureArtist(username: string) {
  const artist = artistByUsername(username);
  const artworks = SEEDS.filter((s) => s.artist === artist.username).map(toGalleryArtwork);
  return { artist, artworks };
}

export function fixtureArtwork(id: string) {
  const seed = SEEDS.find((s) => s.id === id) ?? SEEDS[0];
  const base = toGalleryArtwork(seed);
  return {
    ...base,
    dimensions: seed.dimensions,
    price_range: seed.price,
    views_count: seed.likes * 7 + 91,
    artist: { ...base.artist, avatar_url: null },
  };
}

export function fixtureSpaceArtworks(id: string): SpaceArtwork[] {
  const seed = SEEDS.find((s) => s.id === id) ?? SEEDS[0];
  const artist = artistByUsername(seed.artist);
  const siblings = SEEDS.filter((s) => s.artist === seed.artist && s.id !== seed.id).slice(0, 4);

  return [seed, ...siblings].map((s) => ({
    id: s.id,
    title: s.title,
    displayUrl: `/fixtures/${s.id}.webp`,
    artistName: artist.name,
  }));
}

export function fixtureArtistList() {
  return ARTISTS.map((artist) => {
    const works = SEEDS.filter((s) => s.artist === artist.username).sort(
      (a, b) => b.likes - a.likes,
    );
    return {
      id: artist.id,
      name: artist.name,
      username: artist.username,
      bio: artist.bio,
      avatar_url: artist.avatar_url,
      artworkCount: works.length,
      coverUrl: works[0] ? `/fixtures/${works[0].id}.webp` : null,
    };
  }).sort((a, b) => b.artworkCount - a.artworkCount);
}
