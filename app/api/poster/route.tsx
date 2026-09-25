// Renders a 1080x1080 quote poster. Public on purpose: Facebook downloads the
// image from this URL when a poster post is published.
import { ImageResponse } from "next/og";

// Headlines are always English: the renderer (Satori) cannot shape Bangla
// conjuncts and vowel signs correctly, so Bangla posters come out garbled.
// The font is loaded from Google Fonts, subset to the characters used.
async function loadFont(text: string, family: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@700&text=${encodeURIComponent(text)}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const title = (params.get("title") ?? "").slice(0, 120) || "…";
  const brand = (params.get("brand") ?? "").slice(0, 60);
  const font = await loadFont(title + brand, "Noto+Sans");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 90,
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
          color: "#f8fafc",
          fontFamily: font ? "Poster" : "sans-serif",
        }}
      >
        <div style={{ fontSize: 120, color: "#38bdf8", lineHeight: 1 }}>“</div>
        <div style={{ fontSize: title.length > 60 ? 64 : 80, fontWeight: 700, lineHeight: 1.3 }}>{title}</div>
        <div style={{ fontSize: 34, color: "#94a3b8" }}>{brand}</div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: font ? [{ name: "Poster", data: font, weight: 700, style: "normal" }] : undefined,
    },
  );
}
