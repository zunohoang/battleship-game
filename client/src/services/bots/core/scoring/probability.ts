import { toCellKey } from '@/services/bots/core/shared/boardUtils';

interface HeatMapInput {
  rows: number;
  cols: number;
  shipSizes: readonly number[];
  availableKeys: ReadonlySet<string>;
  missKeys: ReadonlySet<string>;
  requiredHitKeys?: ReadonlySet<string>;
}

function buildPlacementKeys(
  x: number,
  y: number,
  size: number,
  orientation: 'horizontal' | 'vertical',
): string[] {
  const keys: string[] = [];

  for (let i = 0; i < size; i++) {
    const px = x + (orientation === 'horizontal' ? i : 0);
    const py = y + (orientation === 'vertical' ? i : 0);
    keys.push(toCellKey(px, py));
  }

  return keys;
}

function includesAllRequiredHits(
  placementKeys: readonly string[],
  requiredHitKeys: ReadonlySet<string>,
): boolean {
  for (const hitKey of requiredHitKeys) {
    if (!placementKeys.includes(hitKey)) return false;
  }

  return true;
}

export function buildProbabilityHeatMap({
  rows,
  cols,
  shipSizes,
  availableKeys,
  missKeys,
  requiredHitKeys,
}: HeatMapInput): Map<string, number> {
  const heatMap = new Map<string, number>();

  for (const size of shipSizes) {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const maxX = orientation === 'horizontal' ? cols - size : cols - 1;
      const maxY = orientation === 'vertical' ? rows - size : rows - 1;

      for (let y = 0; y <= maxY; y += 1) {
        for (let x = 0; x <= maxX; x += 1) {
          const placementKeys = buildPlacementKeys(x, y, size, orientation);

          if (placementKeys.some((key) => missKeys.has(key))) {
            continue;
          }

          if (
            requiredHitKeys &&
            requiredHitKeys.size > 0 &&
            !includesAllRequiredHits(placementKeys, requiredHitKeys)
          ) {
            continue;
          }

          for (const key of placementKeys) {
            if (!availableKeys.has(key)) continue;
            heatMap.set(key, (heatMap.get(key) ?? 0) + 1);
          }
        }
      }
    }
  }

  return heatMap;
}
