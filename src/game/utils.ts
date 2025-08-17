export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function pickTextColor(bgHex: string): "#000" | "#fff" {
  const hex = bgHex.replace("#", "");
  const n = parseInt(
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex,
    16
  );
  const r = ((n >> 16) & 255) / 255,
    g = ((n >> 8) & 255) / 255,
    b = (n & 255) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? "#000" : "#fff";
}
