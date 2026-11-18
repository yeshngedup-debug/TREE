export const themes = [
  {
    id: "nature",
    label: "Nature & sustainability",
    short: "Nature",
    color: "#83BD83",
    path: 2,
    message: "May Bhutan's forests and green spaces flourish for generations.",
    prompt:
      "I hope Bhutan's forests and green spaces keep thriving for generations.",
  },
  {
    id: "innovation",
    label: "Innovation & technology",
    short: "Innovation",
    color: "#85BCE2",
    path: 3,
    message: "May thoughtful innovation create a brighter future.",
    prompt:
      "I hope thoughtful innovation helps Bhutan build a brighter future.",
  },
  {
    id: "education",
    label: "Education & opportunity",
    short: "Opportunity",
    color: "#EAC16C",
    path: 4,
    message: "May everyone have opportunities to learn and grow.",
    prompt:
      "I hope young people in Bhutan can learn new skills and find meaningful work.",
  },
  {
    id: "community",
    label: "Community & belonging",
    short: "Community",
    color: "#E8A38A",
    path: 3,
    message: "May everyone feel welcome and connected.",
    prompt: "I hope everyone feels welcome and connected to their community.",
  },
  {
    id: "wellbeing",
    label: "Wellbeing & mindfulness",
    short: "Wellbeing",
    color: "#BCA9DD",
    path: 1,
    message: "May Bhutan nurture mindful and healthy lives.",
    prompt: "I hope Bhutan makes space for peaceful, healthy, mindful lives.",
  },
  {
    id: "culture",
    label: "Culture & identity",
    short: "Culture",
    color: "#DDCF94",
    path: 4,
    message: "May our traditions enrich the future.",
    prompt:
      "I hope Bhutanese culture and traditions stay alive as the country grows.",
  },
] as const;
export type Theme = (typeof themes)[number]["id"];
// The four guide paths visitors can explore next. The numeric ids are
// persisted in the approved_leaves.chamber_id column; that column name is
// unchanged so the existing database schema keeps working.
export const guidePaths = {
  1: "Sacred temples & monasteries",
  2: "Scenic valleys & nature",
  3: "Taste of Bhutan",
  4: "Heritage & folktales",
} as const;
export type GuidePathId = keyof typeof guidePaths;
export const pathDetails = {
  1: {
    eyebrow: "Seek stillness",
    short: "Sacred temples",
    reason:
      "Your hope connects with the values, peace and spiritual life at the heart of Bhutan.",
  },
  2: {
    eyebrow: "Follow the trails",
    short: "Valleys & nature",
    reason:
      "Your hope connects with the forests, rivers and wildlife that Bhutan protects.",
  },
  3: {
    eyebrow: "Share a table",
    short: "Taste of Bhutan",
    reason:
      "Your hope connects with the flavours, farms and crafts of everyday Bhutanese life.",
  },
  4: {
    eyebrow: "Gather the stories",
    short: "Heritage & folktales",
    reason:
      "Your hope connects with the stories, traditions and heritage Bhutan carries forward.",
  },
} as const;
export type ContributionReceipt = {
  leaf: Leaf;
  reply: string;
  reply_mode: "openai" | "offline";
  mode: "openai" | "offline";
};
export type Leaf = {
  id: string;
  category: Theme;
  leaf_message: string;
  /** Guide path id 1-4, stored in the chamber_id column. */
  chamber_id: GuidePathId;
  chamber_reason: string;
  created_at: string;
  mode: "openai" | "offline";
  is_demo: boolean;
  /** Slug of the published community post this leaf represents, if any. */
  post_slug?: string;
};
export type TreeStats = {
  total: number;
  today: number;
  demo: number;
  categories: Record<Theme, number>;
};
export type Reflection = {
  body: string;
  mode: "openai" | "offline";
  created_at: string;
};
export type TreeSnapshot = {
  leaves: Leaf[];
  total: number;
  stats: TreeStats;
  reflection: Reflection | null;
  revision: number;
  serverTime: string;
  settings: import("./tree-settings").TreeSettings;
  /** True when the stats query failed; `stats` zeros are not real counts. */
  statsUnavailable?: boolean;
};
export const themeFor = (id: Theme): (typeof themes)[number] => {
  const found = themes.find((theme) => theme.id === id);
  if (!found)
    throw new Error(
      `Unknown theme "${id}". Available: ${themes.map((t) => t.id).join(", ")}`,
    );
  return found;
};
