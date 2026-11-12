import { ImageResponse } from "next/og";

export const alt = "Leadora — des quiz qui qualifient vos prospects";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#151a2d", color: "#fff", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 700 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f5a524", display: "flex" }} />
          Leadora
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, maxWidth: 940 }}>Vos prospects répondent d&apos;abord. Vous leur parlez ensuite.</div>
          <div style={{ fontSize: 30, color: "#f5a524" }}>Quiz marketing, scoring et CRM pour coachs, formateurs et consultants</div>
        </div>
      </div>
    ),
    size,
  );
}
