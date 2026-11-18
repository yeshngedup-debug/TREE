import type { Metadata } from "next";
import { DisplayScreen } from "@/features/display/display-screen";

const description =
  "A Bhutan-shaped living tree on the big screen, one leaf for every anonymous hope left by a visitor. Watch it grow — then leave your own.";

export const metadata: Metadata = {
  title: "The Living Tree · BI Tree",
  description,
  alternates: { canonical: "/display" },
  openGraph: {
    title: "The Living Tree · BI Tree",
    description,
    type: "website",
    url: "/display",
  },
  twitter: { card: "summary_large_image", title: "The Living Tree · BI Tree", description },
};

export default function DisplayPage() {
  return <DisplayScreen />;
}
