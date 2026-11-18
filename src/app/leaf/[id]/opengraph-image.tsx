import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getLeaf } from "@/server/db";
import { themeFor } from "@/lib/catalog";

export const alt = "An anonymous hope on BI Tree, the living idea tree of Bhutan.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

const frauncesMedium = await readFile(
  join(process.cwd(), "assets/fonts/Fraunces-Medium.ttf"),
);
const frauncesSemiBold = await readFile(
  join(process.cwd(), "assets/fonts/Fraunces-SemiBold.ttf"),
);
const iconPng = await readFile(join(process.cwd(), "assets/brand/icon-512.png"));
const iconDataUri = `data:image/png;base64,${iconPng.toString("base64")}`;

function clipped(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Only approved, public leaves render an image — hidden and deleted leaves
  // keep the same 404 behaviour as the page itself.
  const leaf = await getLeaf(id);
  const theme = leaf ? themeFor(leaf.category) : null;
  const message = leaf ? clipped(leaf.leaf_message, 180) : "A hope for Bhutan";
  const chip = theme ? theme.short : "BI Tree";
  const chipColor = theme ? theme.color : "#d8ed92";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#f2efe4",
          padding: "40px",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRadius: "26px",
            backgroundColor: "#141910",
            padding: "56px 64px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                fontFamily: "Fraunces",
                fontWeight: 500,
                fontSize: 21,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#d8ed92",
              }}
            >
              <span
                style={{
                  display: "flex",
                  width: "16px",
                  height: "16px",
                  borderRadius: "999px",
                  backgroundColor: chipColor,
                }}
              />
              {chip} · An anonymous hope
            </div>

            <div
              style={{
                display: "flex",
                marginTop: "30px",
                fontFamily: "Fraunces",
                fontWeight: 600,
                fontSize: 52,
                lineHeight: 1.18,
                letterSpacing: "-0.015em",
                color: "#f8f6ec",
              }}
            >
              “{message}”
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              paddingTop: "28px",
              borderTop: "1px solid #2a3223",
            }}
          >
            <img src={iconDataUri} width="46" height="46" alt="" />
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div
                style={{
                  fontFamily: "Fraunces",
                  fontWeight: 600,
                  fontSize: 25,
                  color: "#f8f6ec",
                }}
              >
                BI Tree
              </div>
              <div
                style={{
                  fontFamily: "Fraunces",
                  fontWeight: 500,
                  fontSize: 14,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "rgba(248, 246, 236, 0.55)",
                }}
              >
                Leave your own hope
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: frauncesMedium, style: "normal", weight: 500 },
        {
          name: "Fraunces",
          data: frauncesSemiBold,
          style: "normal",
          weight: 600,
        },
      ],
    },
  );
}
