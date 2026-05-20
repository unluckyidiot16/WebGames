// === Icon component ===
//
// Tiny helper that renders either:
//   • a PNG path (starts with "/ui/") as an <img> tag, sized inline
//   • anything else (emoji, text) as a plain <span>
//
// This lets us migrate from emoji-as-icon → PNG-as-icon gradually:
// data files can list either an emoji string ("🎲") or a path
// ("/ui/card/die.png"), and consumers don't need to branch.
//
// Sizing: pass `size` in pixels. Defaults to 1em-equivalent (~18-22px
// depending on the surrounding font-size). PNGs are rendered as
// pixelated-friendly (no smoothing).

export default function Icon({ src, size = 22, alt = "", style = {} }) {
  if (!src) return null;
  const isPath = typeof src === "string" && src.startsWith("/");
  if (isPath) {
    return (
      <img
        src={src}
        alt={alt}
        style={{
          width: size,
          height: size,
          verticalAlign: "middle",
          display: "inline-block",
          objectFit: "contain",
          ...style,
        }}
      />
    );
  }
  // Fallback: emoji/text — set fontSize so the inline span matches.
  return (
    <span
      style={{
        fontSize: size,
        lineHeight: 1,
        display: "inline-block",
        verticalAlign: "middle",
        ...style,
      }}
    >
      {src}
    </span>
  );
}
