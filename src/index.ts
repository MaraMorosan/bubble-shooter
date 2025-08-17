// src/index.ts
import { Game, type GameOptions } from "./game/engine";
import type { Theme } from "./game/renderer";

export type BubbleShooterOptions = GameOptions;

export type BubbleShooterController = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  destroy: () => void;
  setTheme: (t: Theme) => void;
  mute: (val: boolean) => void;
};

export function init(
  container: HTMLElement,
  opts: BubbleShooterOptions = {}
): BubbleShooterController {
  const game = new Game(container, opts);
  return {
    start: () => game.start(),
    pause: () => game.pause(),
    resume: () => game.resume(),
    destroy: () => game.destroy(),
    setTheme: (t: Theme) => game.setTheme(t),
    mute: (v) => game.mute(v),
  };
}
