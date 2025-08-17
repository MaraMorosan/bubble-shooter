export type BubbleKind = "red" | "blue" | "green" | "amber";

export const PALETTE: Record<BubbleKind, { fill: string; outline: string; symbol: string }> = {
  red: { fill: "#ef4444", outline: "#991b1b", symbol: "▲" },
  blue: { fill: "#3b82f6", outline: "#1e3a8a", symbol: "●" },
  green: { fill: "#22c55e", outline: "#065f46", symbol: "■" },
  amber: { fill: "#f59e0b", outline: "#92400e", symbol: "✳" },
};

export const START_KINDS: BubbleKind[] = ["blue", "red", "green"];
