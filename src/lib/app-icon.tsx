import { ImageResponse } from "next/og";

const BACKGROUND = "#171512";
const ACCENT = "#e08654";

// Shared artwork for the app icons: a terracotta tile with three time-block
// bars on the dark background. ImageResponse (Satori) only supports inline
// `style`, not Tailwind classes.
export function renderAppIcon(size: number) {
  const tile = Math.round(size * 0.64);
  const bar = Math.round(tile * 0.14);
  const gap = Math.round(tile * 0.1);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BACKGROUND,
        }}
      >
        <div
          style={{
            width: tile,
            height: tile,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap,
            padding: Math.round(tile * 0.18),
            borderRadius: Math.round(tile * 0.2),
            background: ACCENT,
          }}
        >
          {[1, 1, 0.6].map((width, i) => (
            <div
              key={i}
              style={{
                width: `${width * 100}%`,
                height: bar,
                borderRadius: bar / 2,
                background: BACKGROUND,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
