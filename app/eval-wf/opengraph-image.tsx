import { ImageResponse } from "next/og";

export const alt = "Evals with agency · Powered by Workflows";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#ffffff";
const TEXT_PRIMARY = "#141414";
const TEXT_TERTIARY = "#a1a1a1";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BG,
          color: TEXT_PRIMARY,
          padding: "80px 96px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontSize: 88,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            gap: 24,
          }}
        >
          <span>Evals with agency</span>
          <span style={{ color: TEXT_TERTIARY }}>Powered by Workflows</span>
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 30,
            color: "#4f4f4f",
            lineHeight: 1.4,
            maxWidth: 900,
          }}
        >
          A walkthrough of how Reforge Build evaluates the performance of
          chat-based agents using workflows.
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 96,
            fontSize: 20,
            fontWeight: 500,
            color: TEXT_TERTIARY,
            letterSpacing: "0.02em",
          }}
        >
          Reforge Build Acq. by Miro · Vercel Workflows
        </div>
      </div>
    ),
    { ...size },
  );
}
