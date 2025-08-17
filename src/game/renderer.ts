import { pickTextColor } from "./utils";

export type Theme = "light" | "dark" | { bgTop: string; bgBottom: string };

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private theme: Theme;

  constructor(canvas: HTMLCanvasElement, theme: Theme = "light") {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not supported");
    this.ctx = ctx;
    this.canvas = canvas;
    this.theme = theme;
  }

  resize(w: number, h: number) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  setTheme(theme: Theme) {
    this.theme = theme;
  }

  clear() {
    const { width: w, height: h } = this.canvas;
    const g = this.ctx.createLinearGradient(0, 0, 0, h);
    if (this.theme === "dark") {
      g.addColorStop(0, "#0f172a");
      g.addColorStop(1, "#111827");
    } else if (this.theme === "light") {
      g.addColorStop(0, "#e7eef7");
      g.addColorStop(1, "#dfe7f1");
    } else {
      g.addColorStop(0, this.theme.bgTop);
      g.addColorStop(1, this.theme.bgBottom);
    }
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, w, h);
  }

  drawAimLine(x: number, y: number, angle: number, length = 120) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = "#1f2937";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawBubble(x: number, y: number, r: number, fill: string, outline: string, symbol: string) {
    const ctx = this.ctx;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.strokeStyle = outline;
    ctx.stroke();

    const hi = ctx.createRadialGradient(
      x - r * 0.4,
      y - r * 0.4,
      r * 0.1,
      x - r * 0.4,
      y - r * 0.4,
      r
    );
    hi.addColorStop(0, "rgba(255,255,255,0.85)");
    hi.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    const sh = ctx.createRadialGradient(
      x + r * 0.3,
      y + r * 0.35,
      r * 0.1,
      x + r * 0.3,
      y + r * 0.35,
      r
    );
    sh.addColorStop(0, "rgba(0,0,0,0.12)");
    sh.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pickTextColor(fill);
    ctx.font = `bold ${Math.floor(r * 1.1)}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, x, y + 0.5);
    ctx.restore();
  }
}
