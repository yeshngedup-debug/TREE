import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt =
  "BI Tree — a Bhutan-focused community platform where aspirations grow into ideas, and ideas grow into action.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const frauncesMedium = await readFile(
  join(process.cwd(), "assets/fonts/Fraunces-Medium.ttf"),
);
const frauncesSemiBold = await readFile(
  join(process.cwd(), "assets/fonts/Fraunces-SemiBold.ttf"),
);
const iconPng = await readFile(join(process.cwd(), "assets/brand/icon-512.png"));
const iconDataUri = `data:image/png;base64,${iconPng.toString("base64")}`;

export default async function Image() {
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
            borderRadius: "26px",
            backgroundColor: "#141910",
            padding: "56px 64px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Wordmark + tagline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: "640px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                fontFamily: "Fraunces",
                fontWeight: 500,
                fontSize: 22,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "#d8ed92",
              }}
            >
              Bhutan · Community
            </div>

            <div
              style={{
                display: "flex",
                marginTop: "26px",
                fontFamily: "Fraunces",
                fontWeight: 600,
                fontSize: 74,
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
                color: "#f8f6ec",
              }}
            >
              Where aspirations grow into ideas
            </div>

            <div
              style={{
                display: "flex",
                marginTop: "24px",
                fontFamily: "Fraunces",
                fontWeight: 500,
                fontSize: 26,
                lineHeight: 1.45,
                color: "rgba(248, 246, 236, 0.82)",
              }}
            >
              A community platform for sharing practical aspirations and ideas —
              growing into action.
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "18px",
                marginTop: "44px",
                paddingTop: "28px",
                borderTop: "1px solid #2a3223",
              }}
            >
              <img src={iconDataUri} width="54" height="54" alt="" />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div
                  style={{
                    fontFamily: "Fraunces",
                    fontWeight: 600,
                    fontSize: 30,
                    color: "#f8f6ec",
                    letterSpacing: "-0.01em",
                  }}
                >
                  BI Tree
                </div>
                <div
                  style={{
                    fontFamily: "Fraunces",
                    fontWeight: 500,
                    fontSize: 15,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(248, 246, 236, 0.55)",
                  }}
                >
                  The living idea tree
                </div>
              </div>
            </div>
          </div>

          {/* Brand mark */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "290px",
              height: "290px",
              borderRadius: "50%",
              backgroundColor: "#1b2117",
              border: "1px solid #2a3223",
              marginLeft: "40px",
            }}
          >
            <img src={iconDataUri} width="180" height="180" alt="" />
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
