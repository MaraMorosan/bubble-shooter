import { Renderer, type Theme } from "./renderer";
import { Input } from "./input";
import { START_KINDS, PALETTE, type BubbleKind } from "./colors";
import { clamp } from "./utils";
import { Board } from "./board";

export type GameOptions = {
  width?: number;
  height?: number;
  theme?: Theme;
  difficulty?: "easy" | "normal" | "ramp";
  muted?: boolean;
  onScore?: (score: number) => void;
  onEnd?: (score: number) => void;
};

type Bubble = { x: number; y: number; r: number; vx: number; vy: number; kind: BubbleKind };

export class Game {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private hud: HTMLDivElement;
  private renderer: Renderer;
  private input: Input;
  private board: Board;

  private raf = 0;
  private lastTime = 0;

  private shotsSincePop = 0;
  private timeSinceRow = 0;
  private rowsAdded = 0;

  private unlockedColors: BubbleKind[] = START_KINDS.slice();

  private moving: Bubble[] = [];
  private colorPool: BubbleKind[] = START_KINDS.slice();
  private launcher = {
    x: 0,
    y: 0,
    angle: -Math.PI / 2,
    nextKind: START_KINDS[0] as BubbleKind,
    next2Kind: START_KINDS[1] as BubbleKind,
  };

  private score = 0;
  private running = false;
  private readonly baseR = 14;

  private opts: Required<GameOptions> = {
    width: 0,
    height: 0,
    theme: "light",
    difficulty: "ramp",
    muted: true,
    onScore: () => {},
    onEnd: () => {},
  };

  private rowEveryShots =
    this.opts.difficulty === "easy" ? 8 : this.opts.difficulty === "normal" ? 6 : 5;
  private rowEverySeconds =
    this.opts.difficulty === "easy" ? 20 : this.opts.difficulty === "normal" ? 18 : 16;

  private refreshPool() {
    const kinds = this.board.getActiveKinds();
    this.colorPool = kinds.length ? kinds : START_KINDS.slice();
  }
  private randFromPool(): BubbleKind {
    return this.colorPool[Math.floor(Math.random() * this.colorPool.length)];
  }
  private refillQueue() {
    this.refreshPool();
    this.launcher.nextKind = this.randFromPool();
    this.launcher.next2Kind = this.randFromPool();
  }
  private advanceQueue() {
    this.refreshPool();
    this.launcher.nextKind = this.launcher.next2Kind;
    this.launcher.next2Kind = this.randFromPool();
  }
  private ensureQueueValid() {
    this.refreshPool();
    if (!this.colorPool.includes(this.launcher.nextKind))
      this.launcher.nextKind = this.randFromPool();
    if (!this.colorPool.includes(this.launcher.next2Kind))
      this.launcher.next2Kind = this.randFromPool();
  }

  constructor(container: HTMLElement, opts: GameOptions = {}) {
    this.container = container;
    this.opts = { ...this.opts, ...opts };

    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.container.appendChild(this.canvas);

    this.hud = document.createElement("div");
    this.hud.className = "bs-hud";
    this.hud.innerHTML = `
      <div>Score: <strong id="bs-score">0</strong></div>
      <div>
        <button class="bs-btn" id="bs-mute">${this.opts.muted ? "Unmute" : "Mute"}</button>
        <button class="bs-btn" id="bs-pause">Pause</button>
      </div>
    `;
    this.container.appendChild(this.hud);

    this.renderer = new Renderer(this.canvas, this.opts.theme);
    this.input = new Input(this.canvas);

    const rect = this.container.getBoundingClientRect();
    let w = this.opts.width || Math.floor(rect.width);
    let h = this.opts.height || Math.floor(rect.height);
    if (!w || w < 200) w = 800;
    if (!h || h < 200) h = 600;

    this.renderer.resize(w, h);
    this.board = new Board(w, h, this.baseR);

    this.launcher.x = Math.floor(w / 2);
    this.launcher.y = Math.floor(h - Math.min(120, h * 0.12));

    window.addEventListener("resize", this.onResize);
    this.hud.querySelector<HTMLButtonElement>("#bs-mute")?.addEventListener("click", () => {
      this.opts.muted = !this.opts.muted;
      this.hud.querySelector("#bs-mute")!.textContent = this.opts.muted ? "Unmute" : "Mute";
    });
    this.hud.querySelector<HTMLButtonElement>("#bs-pause")?.addEventListener("click", () => {
      if (this.running) this.pause();
      else this.resume();
    });

    this.refillQueue();
    this.canvas.addEventListener("mousedown", this.shoot);
  }

  private onResize = () => {
    const rect = this.container.getBoundingClientRect();
    const w = this.opts.width || Math.floor(rect.width);
    const h = this.opts.height || Math.floor(rect.height);
    this.renderer.resize(w, h);
    this.board.resize(w, h);
    this.launcher.x = Math.floor(w / 2);
    this.launcher.y = Math.floor(h - Math.min(120, h * 0.12));
  };

  setTheme(t: Theme) {
    this.renderer.setTheme(t);
  }
  mute(val: boolean) {
    this.opts.muted = val;
  }

  start() {
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  }
  pause() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
  resume() {
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  }
  destroy() {
    this.pause();
    this.input.dispose();
    window.removeEventListener("resize", this.onResize);
    this.canvas.removeEventListener("mousedown", this.shoot);
    this.container.innerHTML = "";
  }

  private loop = (now: number) => {
    const dt = Math.min(32, now - this.lastTime);
    this.lastTime = now;
    this.update(dt / 1000);
    this.draw();
    if (this.running) this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const dx = this.input.mouseX - this.launcher.x;
    const dy = this.input.mouseY - this.launcher.y;
    this.launcher.angle = clamp(Math.atan2(dy, dx), (-5 * Math.PI) / 6, (-1 * Math.PI) / 6);

    const w = this.canvas.width;

    for (let i = this.moving.length - 1; i >= 0; i--) {
      const b = this.moving[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x < b.r) {
        b.x = b.r;
        b.vx = Math.abs(b.vx);
      }
      if (b.x > w - b.r) {
        b.x = w - b.r;
        b.vx = -Math.abs(b.vx);
      }

      const collide = this.board.collides(b.x, b.y, b.r) || this.board.hitTop(b.y, b.r);
      if (collide) {
        const placed = this.board.snapAndAttach(b.x, b.y, b.kind);
        this.moving.splice(i, 1);

        if (placed) {
          const popped = this.board.popClustersFrom(placed.row, placed.col);
          const dropped = this.board.dropFloaters();

          this.ensureQueueValid();

          const gained = popped.length * 10 + dropped.length * 5;
          if (gained > 0) {
            this.score += gained;
            this.hud.querySelector("#bs-score")!.textContent = String(this.score);
            this.opts.onScore(this.score);
            this.shotsSincePop = 0;
            this.timeSinceRow = 0;
          }
        }
      }
    }

    this.timeSinceRow += dt;

    if (this.shotsSincePop >= this.rowEveryShots || this.timeSinceRow >= this.rowEverySeconds) {
      if (this.rowsAdded === 2 && !this.unlockedColors.includes("amber")) {
        this.unlockedColors.push("amber");
      }

      this.board.addRowRandom(this.unlockedColors);
      this.rowsAdded++;
      this.shotsSincePop = 0;
      this.timeSinceRow = 0;

      this.ensureQueueValid();
    }

    const lowY = this.board.getLowestOccupiedY();
    const danger = lowY > this.launcher.y - this.baseR * 3;
    this.container.style.boxShadow = danger ? "inset 0 0 0 3px rgba(220,38,38,.7)" : "none";
  }

  private draw() {
    const h = this.canvas.height;
    this.renderer.clear();

    this.renderer.drawAimLine(
      this.launcher.x,
      this.launcher.y,
      this.launcher.angle,
      Math.min(160, h * 0.25)
    );

    for (const pb of this.board.getAllPlaced()) {
      const pal = PALETTE[pb.kind];
      this.renderer.drawBubble(pb.x, pb.y, this.baseR, pal.fill, pal.outline, pal.symbol);
    }

    for (const b of this.moving) {
      const pal = PALETTE[b.kind];
      this.renderer.drawBubble(b.x, b.y, b.r, pal.fill, pal.outline, pal.symbol);
    }

    const next1 = PALETTE[this.launcher.nextKind];
    const r1 = Math.min(20, Math.max(16, h * 0.025));
    this.renderer.drawBubble(
      this.launcher.x,
      this.launcher.y,
      r1,
      next1.fill,
      next1.outline,
      next1.symbol
    );

    const next2 = PALETTE[this.launcher.next2Kind];
    const r2 = Math.round(r1 * 0.8);
    this.renderer.drawBubble(
      this.launcher.x + r1 * 1.8,
      this.launcher.y + r1 * 0.25,
      r2,
      next2.fill,
      next2.outline,
      next2.symbol
    );
  }

  private shoot = () => {
    const speed = 480;
    const r = this.baseR;
    const kind = this.launcher.nextKind;
    const vx = Math.cos(this.launcher.angle) * speed;
    const vy = Math.sin(this.launcher.angle) * speed;

    this.moving.push({ x: this.launcher.x, y: this.launcher.y, r, vx, vy, kind });

    this.shotsSincePop++;
    this.advanceQueue();
  };
}
