import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";
import "./surface.css";
import "./redesign.css";
import { HydrationCompatibility } from "@/components/hydration-compat";
import { Interactive3D } from "@/components/interactive-3d";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

function metadataBase() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  try {
    return new URL(configured || "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

const description =
  "Where aspirations grow into ideas, and ideas grow into action. A Bhutan-focused community platform for sharing aspirations and practical ideas, with an interactive 3D Living Tree.";

export const metadata: Metadata = {
  metadataBase: metadataBase(),
  title: {
    default: "BI Tree — Where aspirations grow into ideas",
    template: "%s",
  },
  description,
  applicationName: "BI Tree",
  keywords: [
    "Bhutan",
    "aspirations",
    "ideas",
    "community",
    "innovation",
    "Living Tree",
  ],
  openGraph: {
    type: "website",
    siteName: "BI Tree",
    title: "BI Tree — Where aspirations grow into ideas",
    description,
    locale: "en_BT",
  },
  twitter: {
    card: "summary_large_image",
    title: "BI Tree — Where aspirations grow into ideas",
    description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable}`}>
      <head>
        <HydrationCompatibility />
      </head>
      <body>
        {children}
        <Interactive3D />
      </body>
    </html>
  );
}
