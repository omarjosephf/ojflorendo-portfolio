import { ImageResponse } from "next/og";
import { site } from "@/data/site";

export const alt = `${site.name} — Software Developer & AI-Focused Builder`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          background:
            "radial-gradient(1200px 500px at 85% -10%, #0e2230, #0b0f14 60%)",
          color: "#e8edf2",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              border: "1px solid #223042",
              background: "#111821",
              color: "#2dd4bf",
              fontSize: "22px",
              fontWeight: 700,
            }}
          >
            OJ
          </div>
          <div style={{ display: "flex", fontSize: "22px", color: "#98a6b5" }}>
            Software · AI · Creative Development
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "62px", fontWeight: 700 }}>
            {site.name}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "20px",
              fontSize: "34px",
              color: "#98a6b5",
              maxWidth: "920px",
            }}
          >
            {site.headline}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              width: "180px",
              height: "8px",
              borderRadius: "9999px",
              background: "linear-gradient(90deg, #2dd4bf, #38bdf8)",
            }}
          />
          <div style={{ display: "flex", fontSize: "24px", color: "#98a6b5" }}>
            Windsor, Berkshire · UK
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
