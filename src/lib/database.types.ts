/**
 * Hand-written until a Supabase project exists. Replace wholesale with:
 *   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 */

export type UserRole = 'artist' | 'visitor';
export type PlanTier = 'free' | 'pro' | 'premium';
export type InquiryStatus = 'new' | 'contacted' | 'closed';
export type SubStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';

type Timestamped = { created_at: string };

export type UserRow = Timestamped & {
  id: string;
  role: UserRole;
  name: string | null;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  username: string | null;
  plan: PlanTier;
};

/** One offered size of an artwork. Stored as an element of `size_variants`. */
export type SizeVariant = {
  width_cm: number;
  height_cm: number;
  price_range?: string | null;
};

export type ArtworkRow = Timestamped & {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  medium: string | null;
  dimensions: string | null;
  width_cm: number | null;
  height_cm: number | null;
  size_variants: SizeVariant[];
  year: number | null;
  price_range: string | null;
  original_url: string;
  display_url: string;
  likes_count: number;
  views_count: number;
};

export type ArtworkStats = {
  artwork_id: string;
  title: string;
  views_count: number;
  likes_count: number;
  inquiries_count: number;
  created_at: string;
};

export type LikeRow = Timestamped & { user_id: string; artwork_id: string };

export type InquiryRow = Timestamped & {
  id: string;
  artwork_id: string;
  artist_id: string;
  buyer_name: string;
  buyer_phone: string;
  message: string;
  status: InquiryStatus;
};

export type SubscriptionRow = {
  user_id: string;
  stripe_customer_id: string;
  stripe_sub_id: string | null;
  plan: PlanTier;
  status: SubStatus;
  current_period_end: string | null;
  updated_at: string;
};

/** Columns that are nullable in Postgres may be omitted entirely on insert. */
type NullableKeys<T> = { [K in keyof T]-?: null extends T[K] ? K : never }[keyof T];
type Insertable<T> = Omit<T, NullableKeys<T>> & {
  [K in NullableKeys<T>]?: T[K] | undefined;
};

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>, Rel extends Relationship[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Rel;
};

/**
 * supabase-js resolves embedded selects (`users!artworks_artist_id_fkey(...)`)
 * from this metadata. Names must match the constraint names Postgres generates
 * in 0001_init.sql, or the embed types resolve to `never`.
 */
type ArtworkRelationships = [
  {
    foreignKeyName: 'artworks_artist_id_fkey';
    columns: ['artist_id'];
    isOneToOne: false;
    referencedRelation: 'users';
    referencedColumns: ['id'];
  },
];

type InquiryRelationships = [
  {
    foreignKeyName: 'inquiries_artwork_id_fkey';
    columns: ['artwork_id'];
    isOneToOne: false;
    referencedRelation: 'artworks';
    referencedColumns: ['id'];
  },
  {
    foreignKeyName: 'inquiries_artist_id_fkey';
    columns: ['artist_id'];
    isOneToOne: false;
    referencedRelation: 'users';
    referencedColumns: ['id'];
  },
];

export type Database = {
  public: {
    Tables: {
      users: Table<UserRow, Insertable<Omit<UserRow, 'created_at'>> & { role?: UserRole; plan?: PlanTier }>;
      artworks: Table<
        ArtworkRow,
        Insertable<Omit<ArtworkRow, 'created_at' | 'likes_count' | 'views_count' | 'size_variants'>> & {
          likes_count?: number;
          views_count?: number;
          size_variants?: SizeVariant[];
        },
        Partial<ArtworkRow>,
        ArtworkRelationships
      >;
      likes: Table<LikeRow, Omit<LikeRow, 'created_at'>>;
      artwork_views: Table<
        { artwork_id: string; viewer_hash: string; viewed_on: string },
        { artwork_id: string; viewer_hash: string; viewed_on?: string }
      >;
      inquiries: Table<
        InquiryRow,
        Insertable<Omit<InquiryRow, 'created_at' | 'status'>> & { status?: InquiryStatus },
        Partial<InquiryRow>,
        InquiryRelationships
      >;
      subscriptions: Table<SubscriptionRow, Insertable<Omit<SubscriptionRow, 'updated_at'>>>;
    };
    Views: Record<string, never>;
    Functions: {
      record_artwork_view: {
        Args: { p_artwork_id: string; p_viewer_hash: string };
        Returns: undefined;
      };
      submit_inquiry: {
        Args: {
          p_artwork_id: string;
          p_buyer_name: string;
          p_buyer_phone: string;
          p_message: string;
        };
        Returns: string;
      };
      artist_artwork_stats: {
        Args: Record<string, never>;
        Returns: ArtworkStats[];
      };
    };
    Enums: {
      user_role: UserRole;
      plan_tier: PlanTier;
      inquiry_status: InquiryStatus;
      sub_status: SubStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
