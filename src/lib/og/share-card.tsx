import { ImageResponse } from "next/og";

/** LinkedIn needs at least 1200×627; every card on the site uses this size. */
export const shareCardSize = { width: 1200, height: 630 };
export const shareCardContentType = "image/png";

/**
 * A fixed star field, so each card is identical on every build. The stars keep
 * to the margins and the right-hand edge, so none lands on a letter of a long
 * title.
 */
const STARS: ReadonlyArray<readonly [number, number, number, number]> = [
  [86, 30, 2, 0.7], [212, 24, 1, 0.5], [348, 52, 2, 0.6], [520, 28, 1, 0.45],
  [688, 44, 2, 0.55], [804, 22, 1, 0.5], [948, 70, 3, 0.8], [1096, 110, 2, 0.6],
  [1150, 236, 1, 0.45], [1112, 300, 2, 0.5], [1122, 404, 1, 0.5], [968, 520, 2, 0.6],
  [1104, 566, 1, 0.45], [842, 584, 1, 0.4], [70, 560, 1, 0.45], [40, 300, 2, 0.5],
];

/**
 * Long titles step down in size so a post or case-study title still fits in
 * two or three lines beside the star field.
 */
function titleSize(title: string): number {
  if (title.length <= 18) return 104;
  if (title.length <= 34) return 84;
  if (title.length <= 60) return 68;
  return 56;
}

export interface ShareCardContent {
  /** The small line at the top: the page's kind and the author. */
  eyebrow: string;
  /** The big line: the name, or the page's own title. */
  title: string;
  /** An optional line under the title. */
  line?: string;
}

/**
 * The social preview card for every public page (ADR-0031 D5): the night sky,
 * a gold rule and "Built in public", with each page's own words.
 */
export function renderShareCard({ eyebrow, title, line }: ShareCardContent) {
  const size = titleSize(title);
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
          {eyebrow}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              maxWidth: "1000px",
              fontSize: `${size}px`,
              fontWeight: 800,
              letterSpacing: `${-size / 26}px`,
              lineHeight: size >= 84 ? 0.95 : 1.05,
            }}
          >
            {title}
          </div>
          {line ? (
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
              {line}
            </div>
          ) : null}
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
    { ...shareCardSize },
  );
}
