import type { BotTarget } from '@/services/bots/types';

export function toCellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseCellKey(key: string): BotTarget {
  const [x, y] = key.split(',');
  return { x: Number(x), y: Number(y) };
}

export function isInsideBoard(
  x: number,
  y: number,
  rows: number,
  cols: number,
): boolean {
  return x >= 0 && x < cols && y >= 0 && y < rows;
}

export function orthogonalNeighbors(
  x: number,
  y: number,
  rows: number,
  cols: number,
): BotTarget[] {
  const raw: BotTarget[] = [
    { x: x - 1, y },
    { x: x + 1, y },
    { x, y: y - 1 },
    { x, y: y + 1 },
  ];

  return raw.filter((cell) => isInsideBoard(cell.x, cell.y, rows, cols));
}

export function randomPick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
