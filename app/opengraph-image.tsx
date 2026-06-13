import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "h5.codes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#fffff7";
const TEXT_PRIMARY = "#141414";

export default async function Image() {
  const svg = await readFile(
    join(process.cwd(), "public", "h5-logo.svg"),
    "utf8",
  );
  // ImageResponse <img> can't resolve currentColor — bake the ink color in.
  const inkSvg = svg.replace('fill="currentColor"', `fill="${TEXT_PRIMARY}"`);
  const logoSrc = `data:image/svg+xml;base64,${Buffer.from(inkSvg).toString("base64")}`;

  // logo viewBox aspect 349 / 130.7 ≈ 2.67
  const logoWidth = 560;
  const logoHeight = Math.round(logoWidth / (349 / 130.7));

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
        }}
      >
        <img
          src={logoSrc}
          alt=""
          width={logoWidth}
          height={logoHeight}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { ...size },
  );
}
