import { z } from "zod";
import type { Theme } from "@/lib/catalog";

/**
 * Community content model.
 *
 * Deliberately separate from the anonymous leaf flow: a leaf is a short,
 * moderated hope attached to the Living Tree, while a community post is a
 * titled aspiration or idea with an account author. Both feed the same tree.
 */

export const communityCategorySeeds = [
  {
    slug: "education",
    label: "Education",
    description: "Learning, schools, skills and opportunity for every generation.",
    sortOrder: 10,
  },
  {
    slug: "technology",
    label: "Technology",
    description: "Digital tools, connectivity and thoughtful innovation.",
    sortOrder: 20,
  },
  {
    slug: "entrepreneurship",
    label: "Entrepreneurship",
    description: "Small businesses, crafts, trade and home-grown enterprise.",
    sortOrder: 30,
  },
  {
    slug: "environment",
    label: "Environment",
    description: "Forests, rivers, wildlife, climate and green spaces.",
    sortOrder: 40,
  },
  {
    slug: "agriculture",
    label: "Agriculture",
    description: "Farming, food security and rural livelihoods.",
    sortOrder: 50,
  },
  {
    slug: "culture-heritage",
    label: "Culture and Heritage",
    description: "Traditions, language, festivals, dzongs and living heritage.",
    sortOrder: 60,
  },
  {
    slug: "community-development",
    label: "Community Development",
    description: "Neighbourhoods, public spaces, inclusion and belonging.",
    sortOrder: 70,
  },
  {
    slug: "health-wellbeing",
    label: "Health and Wellbeing",
    description: "Physical health, mental wellbeing and care.",
    sortOrder: 80,
  },
  {
    slug: "tourism",
    label: "Tourism",
    description: "Welcoming visitors while protecting what makes Bhutan unique.",
    sortOrder: 90,
  },
  {
    slug: "innovation",
    label: "Innovation",
    description: "New approaches to old problems, prototypes and research.",
    sortOrder: 100,
  },
  {
    slug: "other",
    label: "Other",
    description: "Ideas that do not fit neatly anywhere else.",
    sortOrder: 110,
  },
] as const;

export const communityContentTypes = ["aspiration", "idea"] as const;
export type CommunityContentType = (typeof communityContentTypes)[number];

export type CommunityCategory = {
  slug: string;
  label: string;
  description: string;
  sortOrder: number;
};

export type CommunityAuthor = {
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
};

export type CommunityAccount = CommunityAuthor & {
  id: string;
  role: "member" | "moderator" | "admin";
  createdAt: string;
};

export type CommunityPostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentType: CommunityContentType;
  category: { slug: string; label: string };
  tags: string[];
  imageUrl: string;
  author: CommunityAuthor;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  featured: boolean;
};

export type CommunityComment = {
  id: string;
  postId: string;
  body: string;
  author: CommunityAuthor;
  createdAt: string;
};

export type CommunityEngagement = {
  liked: boolean;
  bookmarked: boolean;
  likeCount: number;
};

export const communityReportReasons = [
  "spam",
  "harassment",
  "misinformation",
  "unsafe",
  "other",
] as const;

export type CommunityReportReason = (typeof communityReportReasons)[number];

export const communityReportReasonLabels: Record<
  CommunityReportReason,
  string
> = {
  spam: "Spam or advertising",
  harassment: "Harassment or hate",
  misinformation: "Misleading information",
  unsafe: "Unsafe or harmful content",
  other: "Something else",
};

export type CommunityReportStatus = "open" | "resolved" | "dismissed";

export type CommunityReport = {
  id: string;
  reason: CommunityReportReason;
  detail: string;
  status: CommunityReportStatus;
  createdAt: string;
  reporter: { username: string; displayName: string };
  post: { slug: string; title: string; status: string } | null;
  comment: {
    id: string;
    body: string;
    status: string;
    postSlug: string;
  } | null;
};

export type CommunityModerationEntry = {
  id: string;
  actorKind: "staff" | "account";
  actorLabel: string;
  action: string;
  targetKind: string;
  targetId: string;
  note: string;
  createdAt: string;
};

export type CommunityModerationPost = {
  slug: string;
  title: string;
  status: string;
  featured: boolean;
  author: string;
  createdAt: string;
  reportCount: number;
};

export type CommunityModerationComment = {
  id: string;
  body: string;
  status: string;
  postSlug: string;
  postTitle: string;
  author: string;
  createdAt: string;
};

export type CommunityModerationAccount = {
  username: string;
  displayName: string;
  role: "member" | "moderator" | "admin";
  status: "active" | "suspended";
  postCount: number;
  createdAt: string;
};

export type CommunityModerationOverview = {
  counts: {
    openReports: number;
    hiddenPosts: number;
    hiddenComments: number;
    suspendedAccounts: number;
  };
  reports: CommunityReport[];
  posts: CommunityModerationPost[];
  comments: CommunityModerationComment[];
  accounts: CommunityModerationAccount[];
  categories: (CommunityCategory & { postCount: number })[];
  recent: CommunityModerationEntry[];
};

export type CommunityPost = CommunityPostSummary & {
  body: string;
  updatedAt: string;
};

export type CommunityPostList = {
  posts: CommunityPostSummary[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

export const communityContentTypeLabels: Record<CommunityContentType, string> = {
  aspiration: "Aspiration",
  idea: "Idea",
};

const controlCharacters = /[\x00-\x1f\x7f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/;

function text(max: number, min = 0) {
  return z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine(
      (value) => !controlCharacters.test(value),
      "Please remove hidden or control characters.",
    );
}

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Use at least 3 characters.")
  .max(24, "Use at most 24 characters.")
  .transform((value) => value.toLowerCase())
  .refine(
    (value) => /^[a-z0-9_]+$/.test(value),
    "Use 3–24 lowercase letters, numbers or underscores.",
  );

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(200, "Use at most 200 characters.");

const avatarUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value === "" || isHttpsUrl(value),
    "Use an https:// image URL or leave it blank.",
  );

export function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export const signupSchema = z.object({
  username: usernameSchema,
  displayName: text(60, 1),
  password: passwordSchema,
  bio: text(280).default(""),
  avatarUrl: avatarUrlSchema.default(""),
});

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .max(24)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(200),
});

export const profileUpdateSchema = z
  .object({
    displayName: text(60, 1).optional(),
    bio: text(280).optional(),
    avatarUrl: avatarUrlSchema.optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "Change at least one profile field.",
  );

export function slugifyTag(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

const tagSchema = z
  .string()
  .trim()
  .min(2)
  .max(24)
  .transform(slugifyTag)
  .refine((value) => value.length >= 2, "Use at least 2 letters.");

export const postCreateSchema = z.object({
  title: text(120, 6),
  body: text(5000, 20),
  contentType: z.enum(communityContentTypes),
  category: z
    .string()
    .trim()
    .max(48)
    .refine(
      (value) => /^[a-z0-9-]{2,48}$/.test(value),
      "Choose a category.",
    ),
  tags: z
    .array(tagSchema)
    .max(6, "Use at most 6 tags.")
    .default([])
    .transform((tags) => Array.from(new Set(tags))),
  imageUrl: avatarUrlSchema.default(""),
});

/** Editing replaces every field, so the same validation applies. */
export const postUpdateSchema = postCreateSchema;

export const commentCreateSchema = z.object({
  body: text(1200, 2),
});

export const reportCreateSchema = z.object({
  reason: z.enum(communityReportReasons),
  detail: text(500).default(""),
});

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(48)
  .refine(
    (value) => /^[a-z0-9-]+$/.test(value),
    "Use a lowercase category slug.",
  );

export const categoryUpdateSchema = z.object({
  slug: slugSchema,
  label: text(60, 2),
  description: text(280).default(""),
});

export const moderationActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("post_status"),
    target: z.string().trim().min(1).max(80),
    status: z.enum(["published", "hidden", "removed"]),
    note: text(280).default(""),
  }),
  z.object({
    action: z.literal("comment_status"),
    target: z.string().uuid(),
    status: z.enum(["published", "hidden", "removed"]),
    note: text(280).default(""),
  }),
  z.object({
    action: z.literal("feature"),
    target: z.string().trim().min(1).max(80),
    featured: z.boolean(),
    note: text(280).default(""),
  }),
  z.object({
    action: z.literal("report_status"),
    target: z.string().uuid(),
    status: z.enum(["resolved", "dismissed"]),
    note: text(280).default(""),
  }),
  z.object({
    action: z.literal("account_status"),
    target: z.string().trim().min(3).max(24),
    status: z.enum(["active", "suspended"]),
    note: text(280).default(""),
  }),
  z.object({
    action: z.literal("account_role"),
    target: z.string().trim().min(3).max(24),
    role: z.enum(["member", "moderator", "admin"]),
    note: text(280).default(""),
  }),
  z.object({
    action: z.literal("category"),
    slug: slugSchema,
    label: text(60, 2),
    description: text(280).default(""),
    note: text(280).default(""),
  }),
]);

export type ModerationAction = z.infer<typeof moderationActionSchema>;

export const postQuerySchema = z.object({
  q: z.string().trim().max(80).default(""),
  type: z.enum(communityContentTypes).optional(),
  category: z
    .string()
    .trim()
    .max(48)
    .optional()
    .transform((value) => (value && /^[a-z0-9-]{2,48}$/.test(value) ? value : undefined)),
  tag: z
    .string()
    .trim()
    .max(24)
    .optional()
    .transform((value) => (value ? slugifyTag(value) || undefined : undefined)),
  sort: z.enum(["newest", "popular"]).default("newest"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export type PostQuery = z.infer<typeof postQuerySchema>;

export function parseCommunityQuery(
  raw: Record<string, string | string[] | undefined>,
) {
  const first = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const candidate = {
    q: first("q") ?? "",
    type: first("type") ?? undefined,
    category: first("category") ?? undefined,
    tag: first("tag") ?? undefined,
    sort: first("sort") ?? "newest",
    page: first("page") ?? 1,
    pageSize: first("pageSize") ?? 12,
  };
  const parsed = postQuerySchema.safeParse(candidate);
  return parsed.success ? parsed.data : postQuerySchema.parse({});
}

export function slugifyTitle(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");
  return slug || "post";
}

export function excerptOf(body: string, length = 180) {
  const collapsed = body.replace(/\s+/g, " ").trim();
  if (collapsed.length <= length) return collapsed;
  return `${collapsed.slice(0, length).replace(/\s+\S*$/, "")}…`;
}

/**
 * Community categories are broader than the six Living Tree themes. The map
 * keeps every published post on a sensible branch instead of inventing new
 * themes for the 3D tree.
 */
const categoryLeafThemes: Record<string, Theme> = {
  education: "education",
  technology: "innovation",
  entrepreneurship: "innovation",
  environment: "nature",
  agriculture: "nature",
  "culture-heritage": "culture",
  "community-development": "community",
  "health-wellbeing": "wellbeing",
  tourism: "culture",
  innovation: "innovation",
  other: "community",
};

export function leafThemeForCategory(slug: string): Theme {
  return categoryLeafThemes[slug] ?? "community";
}

export function communityLeafMessage(title: string, body: string) {
  const message = `${title.trim()}: ${excerptOf(body, 150)}`;
  return message.slice(0, 220);
}

/** Accept only same-site paths for post-login redirects. */
export function safeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "";
  return value.slice(0, 300);
}

export function formatPostDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
