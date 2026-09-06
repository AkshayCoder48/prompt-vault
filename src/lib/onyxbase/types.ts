/** Shared domain types for the Prompt Hoster. */

export interface Prompt {
  id: string;
  slug: string;
  title: string;
  description: string;
  prompt: string;
  imageUrl: string | null;
  imageAlt?: string | null;
  categoryId: string | null; // null = Uncategorized
  authorName: string;
  tags: string[];
  featured: boolean;
  published: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  views: number;
  copies: number;
  likes: number;
  saves: number;
  /** Optional subdomain slug mapped to this prompt (e.g. "myart" → myart.domain.com). */
  subdomain?: string | null;
  // flat source fields (minimal schema — directly authored records)
  sourceUrl?: string | null;
  sourceId?: string | null;
  model?: string | null;
  previewUrl?: string | null;
  pinterest?: { status?: string; postId?: string | null; pinUrl?: string | null; publishedAt?: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  featured: boolean;
  promptCount?: number;
  /** Prompt ids that belong to this category. The category's image is the
   *  first prompt's image (promptIds[0]). Edit this list to add/remove prompts. */
  promptIds?: string[];
  createdAt: string;
}

export type CommentStatus = "pending" | "published" | "hidden" | "deleted" | "reported";

export interface Comment {
  id: string;
  promptId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  content: string;
  likes: number;
  status: CommentStatus;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

export interface Visitor {
  id: string;
  name?: string;
  createdAt: string;
  lastSeen: string;
}

export interface SiteConfig {
  siteName: string;
  siteDescription: string;
  logo: string | null;
  favicon: string | null;
  maintenanceMode: boolean;
  commentsEnabled: boolean;
  adsEnabled: boolean;
  homepageTitle: string;
  homepageDescription: string;
  featuredPromptIds: string[];
  adPlacements: {
    header: boolean;
    homepageFeed: boolean;
    promptInline: boolean;
    sidebar: boolean;
    footer: boolean;
    searchResults: boolean;
  };
  adminPassword: string;       // empty = admin login disabled (set in Onyx Base)
  adminAccessKey: string | null; // secret URL key to reach the admin panel (set in Onyx Base)
}

export type AnalyticsEventType =
  | "prompt_view"
  | "prompt_copy"
  | "prompt_like"
  | "prompt_save"
  | "search"
  | "category_view"
  | "comment_created"
  | "share";

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  promptId?: string;
  visitorId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PromptFilters {
  q?: string;
  category?: string; // category slug
  tag?: string;
  sort?: "newest" | "popular" | "copied" | "liked" | "trending" | "featured";
  featured?: boolean;
  limit?: number;
  offset?: number;
}
