import type { Theme } from "./catalog";

// Curated from widely documented public sources rather than generated claims.
// Official .bt government portals were unreachable from the build network, so
// these cite Wikipedia pages that document the facts instead. Keep future
// proposals described as aims or plans, and prefer official sources when an
// official link has been verified reachable.
export const bhutanFacts: Record<Theme, { text: string; source: string }> = {
  nature: {
    text: "Bhutan's constitution requires at least 60% forest cover for all time; today around 70% of the country remains forested.",
    source: "https://en.wikipedia.org/wiki/Constitution_of_Bhutan",
  },
  innovation: {
    text: "Bhutan measures progress by Gross National Happiness — balancing sustainable development, cultural preservation, environmental conservation and good governance.",
    source: "https://en.wikipedia.org/wiki/Gross_National_Happiness",
  },
  education: {
    text: "Education is free in Bhutanese schools, and the national curriculum pairs modern subjects with living heritage, meditation and Gross National Happiness values.",
    source: "https://en.wikipedia.org/wiki/Education_in_Bhutan",
  },
  community: {
    text: "Bhutan's 20 districts (dzongkhags) are administered from historic dzong fortresses that house both government offices and monastic communities, tying civil life and faith together.",
    source: "https://en.wikipedia.org/wiki/Districts_of_Bhutan",
  },
  wellbeing: {
    text: "Gross National Happiness is a constitutional development framework, placing psychological and emotional wellbeing alongside economic growth.",
    source: "https://en.wikipedia.org/wiki/Gross_National_Happiness",
  },
  culture: {
    text: "Bhutan is one of the world's last remaining Vajrayana Buddhist kingdoms, with Paro Taktsang, the Tiger's Nest monastery, clinging to a cliff 900 metres above the valley floor.",
    source: "https://en.wikipedia.org/wiki/Paro_Taktsang",
  },
};
