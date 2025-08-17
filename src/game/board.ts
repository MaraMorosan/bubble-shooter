import { START_KINDS, type BubbleKind } from "./colors";

export type Placed = { row: number; col: number; x: number; y: number; kind: BubbleKind };

export class Board {
  readonly r: number;
  readonly dx: number;
  readonly dy: number;
  readonly margin: number = 8;
  private w = 0;
  private h = 0;

  private pos: { x: number; y: number }[][] = [];
  private cells: (BubbleKind | null)[][] = [];

  constructor(width: number, height: number, radius: number) {
    this.r = radius;
    this.dx = this.r * 2;
    this.dy = Math.sqrt(3) * this.r;
    this.resize(width, height);
    this.seedInitialRows(5);
  }

  resize(width: number, height: number) {
    this.w = width;
    this.h = height;
    this.buildGrid();
  }

  getActiveKinds(): import("./colors").BubbleKind[] {
    const s = new Set<import("./colors").BubbleKind>();
    for (let r = 0; r < this.cells.length; r++) {
      for (let c = 0; c < this.cells[r].length; c++) {
        const k = this.cells[r][c];
        if (k) s.add(k);
      }
    }
    return Array.from(s);
  }

  addRowRandom(kinds: import("./colors").BubbleKind[]) {
    if (!this.pos.length) this.buildGrid();
    if (!this.pos.length) return;

    if (!this.cells.length) {
      this.cells = this.pos.map((row) => new Array(row.length).fill(null));
    }

    const newLen = this.pos[0].length;
    const newRow: (import("./colors").BubbleKind | null)[] = Array.from(
      { length: newLen },
      () => kinds[Math.floor(Math.random() * kinds.length)]
    );

    const nextCells: (import("./colors").BubbleKind | null)[][] = new Array(this.pos.length);
    nextCells[0] = newRow;

    for (let row = 1; row < this.pos.length; row++) {
      const src = this.cells[row - 1] ?? [];
      const dstLen = this.pos[row].length;
      const dst = new Array(dstLen).fill(null);
      const copyLen = Math.min(src.length, dstLen);
      for (let i = 0; i < copyLen; i++) dst[i] = src[i];
      nextCells[row] = dst;
    }

    this.cells = nextCells;
  }

  getLowestOccupiedY(): number {
    let maxY = 0;
    for (let r = 0; r < this.pos.length; r++) {
      for (let c = 0; c < this.pos[r].length; c++) {
        if (this.cells[r][c]) {
          const p = this.pos[r][c];
          if (p.y > maxY) maxY = p.y;
        }
      }
    }
    return maxY;
  }

  getAllPlaced(): Placed[] {
    const out: Placed[] = [];
    for (let row = 0; row < this.pos.length; row++) {
      for (let col = 0; col < this.pos[row].length; col++) {
        const kind = this.cells[row][col];
        if (kind) {
          const p = this.pos[row][col];
          out.push({ row, col, x: p.x, y: p.y, kind });
        }
      }
    }
    return out;
  }

  collides(x: number, y: number, r: number): boolean {
    const rr = (this.r + r - 0.5) * (this.r + r - 0.5);
    for (const pb of this.getAllPlaced()) {
      const dx = pb.x - x;
      const dy = pb.y - y;
      if (dx * dx + dy * dy <= rr) return true;
    }
    return false;
  }

  hitTop(y: number, r: number): boolean {
    const topY = this.margin + this.r;
    return y - r <= topY - this.r * 0.4;
  }

  snapAndAttach(x: number, y: number, kind: BubbleKind): Placed | null {
    const cand = this.findNearestEmptyCell(x, y, true) ?? this.findNearestEmptyCell(x, y, false);
    if (!cand) return null;
    this.cells[cand.row][cand.col] = kind;
    const p = this.pos[cand.row][cand.col];
    return { row: cand.row, col: cand.col, x: p.x, y: p.y, kind };
  }

  popClustersFrom(row: number, col: number): Placed[] {
    const kind = this.cells[row][col];
    if (!kind) return [];
    const cluster = this.floodSame(row, col, kind);
    if (cluster.length >= 3) {
      for (const { row: r, col: c } of cluster) this.cells[r][c] = null;
      return cluster.map(({ row: r, col: c }) => {
        const p = this.pos[r][c];
        return { row: r, col: c, x: p.x, y: p.y, kind };
      });
    }
    return [];
  }

  dropFloaters(): Placed[] {
    const visited = new Set<string>();
    for (let c = 0; c < this.cells[0].length; c++) {
      if (this.cells[0][c]) this.floodAll(0, c, visited);
    }
    const dropped: Placed[] = [];
    for (let r = 0; r < this.cells.length; r++) {
      for (let c = 0; c < this.cells[r].length; c++) {
        if (this.cells[r][c] && !visited.has(this.key(r, c))) {
          const kind = this.cells[r][c]!;
          this.cells[r][c] = null;
          const p = this.pos[r][c];
          dropped.push({ row: r, col: c, x: p.x, y: p.y, kind });
        }
      }
    }
    return dropped;
  }

  private buildGrid() {
    const yStart = this.margin + this.r;
    const xEvenStart = this.margin + this.r;
    const xOddStart = xEvenStart + this.r;
    const xMax = this.w - (this.margin + this.r);

    const rows: { x: number; y: number }[][] = [];
    const cells: (BubbleKind | null)[][] = [];

    for (let row = 0; ; row++) {
      const y = yStart + row * this.dy;
      if (y > this.h - this.margin - this.r) break;

      const parity = row % 2;
      const xStart = parity ? xOddStart : xEvenStart;

      const positions: { x: number; y: number }[] = [];
      for (let x = xStart; x <= xMax; x += this.dx) {
        positions.push({ x, y });
      }
      if (positions.length === 0) break;

      rows.push(positions);
      cells.push(new Array(positions.length).fill(null));
    }

    this.pos = rows;
    this.cells = cells;
  }

  private seedInitialRows(n: number) {
    const rows = Math.min(n, this.pos.length);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < this.pos[r].length; c++) {
        const fill = r < rows - 1 || c % 2 === 0;
        this.cells[r][c] = fill
          ? START_KINDS[Math.floor(Math.random() * START_KINDS.length)]
          : null;
      }
    }
  }

  private findNearestEmptyCell(x: number, y: number, requireSupport: boolean) {
    const yStart = this.margin + this.r;
    const approxRow = Math.round((y - yStart) / this.dy);
    const candidates: { row: number; col: number; d2: number }[] = [];

    for (let rr = approxRow - 2; rr <= approxRow + 2; rr++) {
      if (rr < 0 || rr >= this.pos.length) continue;
      for (let cc = -2; cc <= this.pos[rr].length + 1; cc++) {
        if (cc < 0 || cc >= this.pos[rr].length) continue;
        if (this.cells[rr][cc]) continue; // ocupat
        if (requireSupport && rr > 0) {
          const hasSupport = this.neighbors(rr, cc).some(
            ({ row, col }) => this.inBounds(row, col) && this.cells[row][col]
          );
          if (!hasSupport && rr !== 0) continue;
        }
        const p = this.pos[rr][cc];
        const dx = p.x - x,
          dy = p.y - y;
        candidates.push({ row: rr, col: cc, d2: dx * dx + dy * dy });
      }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.d2 - b.d2);
    return { row: candidates[0].row, col: candidates[0].col };
  }

  private floodSame(row: number, col: number, kind: BubbleKind) {
    const out: { row: number; col: number }[] = [];
    const seen = new Set<string>();
    const stack: { row: number; col: number }[] = [{ row, col }];
    while (stack.length) {
      const cur = stack.pop()!;
      const key = this.key(cur.row, cur.col);
      if (seen.has(key)) continue;
      seen.add(key);
      if (!this.inBounds(cur.row, cur.col)) continue;
      if (this.cells[cur.row][cur.col] !== kind) continue;
      out.push(cur);
      for (const n of this.neighbors(cur.row, cur.col)) {
        if (this.inBounds(n.row, n.col)) stack.push(n);
      }
    }
    return out;
  }

  private floodAll(row: number, col: number, visited: Set<string>) {
    const stack: { row: number; col: number }[] = [{ row, col }];
    while (stack.length) {
      const cur = stack.pop()!;
      const key = this.key(cur.row, cur.col);
      if (visited.has(key)) continue;
      if (!this.inBounds(cur.row, cur.col)) continue;
      if (!this.cells[cur.row][cur.col]) continue;
      visited.add(key);
      for (const n of this.neighbors(cur.row, cur.col)) stack.push(n);
    }
  }

  private neighbors(row: number, col: number) {
    const odd = row % 2 === 1;
    const around = odd
      ? [
          { row, col: col - 1 },
          { row, col: col + 1 },
          { row: row - 1, col },
          { row: row - 1, col: col + 1 },
          { row: row + 1, col },
          { row: row + 1, col: col + 1 },
        ]
      : [
          { row, col: col - 1 },
          { row, col: col + 1 },
          { row: row - 1, col: col - 1 },
          { row: row - 1, col },
          { row: row + 1, col: col - 1 },
          { row: row + 1, col },
        ];
    return around;
  }

  private inBounds(row: number, col: number) {
    return row >= 0 && row < this.pos.length && col >= 0 && col < this.pos[row].length;
  }

  private key(r: number, c: number) {
    return `${r}:${c}`;
  }
}
