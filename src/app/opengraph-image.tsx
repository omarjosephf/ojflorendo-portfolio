import { ImageResponse } from "next/og";
import { site } from "@/data/site";

export const alt = `${site.name} — ${site.descriptor}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** A fixed star field, so the card is identical on every build. */
const STARS: ReadonlyArray<readonly [number, number, number, number]> = [
  [86, 74, 2, 0.7], [212, 140, 1, 0.5], [348, 52, 2, 0.6], [520, 96, 1, 0.45],
  [688, 44, 2, 0.55], [804, 128, 1, 0.5], [948, 70, 3, 0.8], [1096, 110, 2, 0.6],
  [1150, 236, 1, 0.45], [1012, 300, 2, 0.5], [1122, 404, 1, 0.5], [968, 520, 2, 0.6],
  [1104, 566, 1, 0.45], [842, 584, 1, 0.4], [70, 560, 1, 0.45], [40, 300, 2, 0.5],
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          position: "relative",
          background: "#05060a",
          color: "#eef1f7",
          fontFamily: "sans-serif",
        }}
      >
        {STARS.map(([x, y, r, a]) => (
          <div
            key={`${x}-${y}`}
            style={{
              position: "absolute",
              left: `${x}px`,
              top: `${y}px`,
              width: `${r * 2}px`,
              height: `${r * 2}px`,
              borderRadius: "9999px",
              background: `rgba(234, 242, 255, ${a})`,
            }}
          />
        ))}
        <div style={{ display: "flex", fontSize: "26px", color: "#a4aaba" }}>
          {`${site.descriptor} · Windsor, UK`}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "104px", fontWeight: 800, letterSpacing: "-4px", lineHeight: 0.95 }}>
            {site.name}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "28px",
              fontSize: "36px",
              color: "#d6dbe6",
              maxWidth: "900px",
              lineHeight: 1.3,
            }}
          >
            {site.headline}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              width: "160px",
              height: "6px",
              borderRadius: "9999px",
              background: "#f2c66d",
            }}
          />
          <div style={{ display: "flex", fontSize: "24px", color: "#a4aaba" }}>
            Built in public
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
