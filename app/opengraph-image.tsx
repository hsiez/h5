import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "h5.codes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#fffff7";
const TEXT_PRIMARY = "#141414";

export default async function Image() {
  const logo = await readFile(
    join(process.cwd(), "public", "h5-logo-letterpress-flat-black.png"),
  );
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BG,
          color: TEXT_PRIMARY,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={logoSrc}
            alt=""
            width={210}
            height={210}
            style={{ objectFit: "contain" }}
          />
          <span
            style={{
              fontSize: 128,
              lineHeight: 1,
              fontWeight: 400,
              marginLeft: -24,
              transform: "translateY(25px)",
            }}
          >
            .codes
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
