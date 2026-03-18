import type { BotShot, BotTarget } from '@/services/bots/types';
import {
  orthogonalNeighbors,
  toCellKey,
} from '@/services/bots/core/shared/boardUtils';

export interface HitCluster {
  cells: BotTarget[];
  orientation: 'horizontal' | 'vertical' | null;
}

export interface ShotSets {
  hitKeys: Set<string>;
  missKeys: Set<string>;
}

export function buildShotSets(shots: readonly BotShot[]): ShotSets {
  const hitKeys = new Set<string>();
  const missKeys = new Set<string>();

  for (const shot of shots) {
    const key = toCellKey(shot.x, shot.y);
    if (shot.isHit) {
      hitKeys.add(key);
    } else {
      missKeys.add(key);
    }
  }

  return { hitKeys, missKeys };
}

function clusterOrientation(
  cells: readonly BotTarget[],
): HitCluster['orientation'] {
  if (cells.length <= 1) return null;

  const rows = new Set(cells.map((c) => c.y));
  const cols = new Set(cells.map((c) => c.x));

  if (rows.size === 1) return 'horizontal';
  if (cols.size === 1) return 'vertical';
  return null;
}

export function buildHitClusters(
  shots: readonly BotShot[],
  rows: number,
  cols: number,
): HitCluster[] {
  const hits = shots
    .filter((shot) => shot.isHit)
    .map((shot) => ({ x: shot.x, y: shot.y }));

  const hitKeySet = new Set(hits.map((h) => toCellKey(h.x, h.y)));
  const visited = new Set<String>();
  const clusters: HitCluster[] = [];

  for (const hit of hits) {
    const startKey = toCellKey(hit.x, hit.y);
    if (visited.has(startKey)) {
      continue;
    }

    const queue: BotTarget[] = [hit];
    const cells: BotTarget[] = [];
    visited.add(startKey);

    while (queue.length > 0) {
      const curr = queue.shift();
      if (!curr) continue;
      cells.push(curr);

      for (const n of orthogonalNeighbors(curr.x, curr.y, rows, cols)) {
        const nKey = toCellKey(n.x, n.y);
        if (hitKeySet.has(nKey) && !visited.has(nKey)) {
          visited.add(nKey);
          queue.push(n);
        }
      }
    }

    clusters.push({ cells, orientation: clusterOrientation(cells) });
  }
  return clusters;
}

function uniqueTargets(cells: readonly BotTarget[]): BotTarget[] {
  const seen = new Set<String>();
  const out: BotTarget[] = [];

  for (const cell of cells) {
    const key = toCellKey(cell.x, cell.y);

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cell);
  }
  return out;
}

export function openTargetsAroundCluster(
  cluster: HitCluster,
  attemptedShots: ReadonlySet<string>,
  rows: number,
  cols: number,
): BotTarget[] {
  const candidates: BotTarget[] = [];

  if (cluster.orientation === 'horizontal') {
    const sorted = [...cluster.cells].sort((a, b) => a.x - b.x);
    const left = { x: sorted[0].x - 1, y: sorted[0].y };
    const right = { x: sorted[sorted.length - 1].x + 1, y: sorted[0].y };
    candidates.push(left, right);
  } else if (cluster.orientation === 'vertical') {
    const sorted = [...cluster.cells].sort((a, b) => a.y - b.y);
    const top = { x: sorted[0].x, y: sorted[0].y - 1 };
    const bottom = { x: sorted[0].x, y: sorted[sorted.length - 1].y + 1 };
    candidates.push(top, bottom);
  } else {
    for (const cell of cluster.cells) {
      candidates.push(...orthogonalNeighbors(cell.x, cell.y, rows, cols));
    }
  }

  return uniqueTargets(candidates).filter((candidate) => {
    const key = toCellKey(candidate.x, candidate.y);
    return (
      candidate.x >= 0 &&
      candidate.x < cols &&
      candidate.y >= 0 &&
      candidate.y < rows &&
      !attemptedShots.has(key)
    );
  });
}
