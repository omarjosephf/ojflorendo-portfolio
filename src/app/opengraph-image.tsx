import { ImageResponse } from "next/og";
import { site } from "@/data/site";

export const alt = `${site.name} — Websites and AI document assistants`;
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
            "#f5f2e9",
          color: "#292a26",
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
              borderRadius: "28px",
              border: "1px solid #d4d1c5",
              background: "#292a26",
              color: "#f5f2e9",
              fontSize: "22px",
              fontWeight: 700,
            }}
          >
            OJ
          </div>
          <div style={{ display: "flex", fontSize: "22px", color: "#65665c" }}>
            Web development · AI document assistants
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "62px", fontWeight: 700 }}>
            Make your services clear.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "20px",
              fontSize: "34px",
              color: "#65665c",
              maxWidth: "920px",
            }}
          >
            {`${site.headline} · ${site.name}`}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              width: "180px",
              height: "8px",
              borderRadius: "9999px",
              background: "#294fc9",
            }}
          />
          <div style={{ display: "flex", fontSize: "24px", color: "#65665c" }}>
            Windsor, Berkshire · UK
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
