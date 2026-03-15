import i18n from '@/i18n';

export type ShipSpriteDirection = 'up' | 'down' | 'left' | 'right';

export type ShipSpriteSize = 1 | 2 | 3 | 4 | 5;

export interface ShipSpriteFrame {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ShipSpriteSheetMeta {
    imageWidth: number;
    imageHeight: number;
    frames: Record<ShipSpriteDirection, Record<ShipSpriteSize, ShipSpriteFrame>>;
}

interface ConnectedComponent {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    area: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(i18n.t('errors.spriteLoadFailed', { src })));
    image.src = src;
  });
}

function getAlphaIndex(x: number, y: number, width: number) {
  return (y * width + x) * 4 + 3;
}

function getBoundingBox(component: ConnectedComponent): ShipSpriteFrame {
  return {
    x: component.minX,
    y: component.minY,
    width: component.maxX - component.minX + 1,
    height: component.maxY - component.minY + 1,
  };
}

function detectDirection(
  component: ConnectedComponent,
  imageWidth: number,
  imageHeight: number,
): ShipSpriteDirection {
  const centerX = (component.minX + component.maxX) / 2;
  const centerY = (component.minY + component.maxY) / 2;
  const isLeftHalf = centerX < imageWidth / 2;
  const isTopHalf = centerY < imageHeight / 2;

  if (isTopHalf && isLeftHalf) return 'up';
  if (isTopHalf && !isLeftHalf) return 'right';
  if (!isTopHalf && isLeftHalf) return 'down';
  return 'left';
}

function sortComponentsBySize(
  components: ConnectedComponent[],
  direction: ShipSpriteDirection,
): ConnectedComponent[] {
  const usesHeight = direction === 'up' || direction === 'down';
  return [...components].sort((a, b) => {
    const aMetric = usesHeight ? a.maxY - a.minY : a.maxX - a.minX;
    const bMetric = usesHeight ? b.maxY - b.minY : b.maxX - b.minX;
    return aMetric - bMetric;
  });
}

function extractConnectedComponents(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number,
): ConnectedComponent[] {
  const visited = new Uint8Array(width * height);
  const components: ConnectedComponent[] = [];

  for (let startY = 0; startY < height; startY += 1) {
    for (let startX = 0; startX < width; startX += 1) {
      const pixelIndex = startY * width + startX;
      if (visited[pixelIndex]) continue;
      visited[pixelIndex] = 1;

      if (alpha[getAlphaIndex(startX, startY, width)] <= alphaThreshold) {
        continue;
      }

      const queue: Array<[number, number]> = [[startX, startY]];
      let queueIndex = 0;
      let minX = startX;
      let minY = startY;
      let maxX = startX;
      let maxY = startY;
      let area = 0;

      while (queueIndex < queue.length) {
        const [x, y] = queue[queueIndex];
        queueIndex += 1;
        area += 1;

        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;

        const neighbors: Array<[number, number]> = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ];

        for (const [nextX, nextY] of neighbors) {
          if (
            nextX < 0 ||
                        nextX >= width ||
                        nextY < 0 ||
                        nextY >= height
          ) {
            continue;
          }

          const nextPixelIndex = nextY * width + nextX;
          if (visited[nextPixelIndex]) continue;
          visited[nextPixelIndex] = 1;

          if (alpha[getAlphaIndex(nextX, nextY, width)] > alphaThreshold) {
            queue.push([nextX, nextY]);
          }
        }
      }

      components.push({ minX, minY, maxX, maxY, area });
    }
  }

  return components;
}

export async function extractShipSpriteSheetMeta(
  spriteSheetUrl: string,
): Promise<ShipSpriteSheetMeta> {
  const image = await loadImage(spriteSheetUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error(i18n.t('errors.spriteContextUnavailable'));
  }

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const components = extractConnectedComponents(
    imageData.data,
    canvas.width,
    canvas.height,
    8,
  ).filter((component) => component.area > 24);

  const grouped = {
    up: [] as ConnectedComponent[],
    down: [] as ConnectedComponent[],
    left: [] as ConnectedComponent[],
    right: [] as ConnectedComponent[],
  };

  for (const component of components) {
    grouped[detectDirection(component, canvas.width, canvas.height)].push(component);
  }

  const directions: ShipSpriteDirection[] = ['up', 'down', 'left', 'right'];
  const frames = {
    up: {} as Record<ShipSpriteSize, ShipSpriteFrame>,
    down: {} as Record<ShipSpriteSize, ShipSpriteFrame>,
    left: {} as Record<ShipSpriteSize, ShipSpriteFrame>,
    right: {} as Record<ShipSpriteSize, ShipSpriteFrame>,
  };

  for (const direction of directions) {
    const sorted = sortComponentsBySize(grouped[direction], direction);
    if (sorted.length !== 5) {
      throw new Error(
        i18n.t('errors.spriteDirectionCountInvalid', {
          direction,
          count: sorted.length,
        }),
      );
    }

    sorted.forEach((component, index) => {
      const size = (index + 1) as ShipSpriteSize;
      frames[direction][size] = getBoundingBox(component);
    });
  }

  return {
    imageWidth: canvas.width,
    imageHeight: canvas.height,
    frames,
  };
}

export function getShipSpriteStyle(
  spriteSheetUrl: string,
  meta: ShipSpriteSheetMeta,
  direction: ShipSpriteDirection,
  size: ShipSpriteSize,
  renderWidth: number,
  renderHeight: number,
): Record<string, string> {
  const frame = meta.frames[direction][size];
  const scaleX = renderWidth / frame.width;
  const scaleY = renderHeight / frame.height;

  return {
    width: `${renderWidth}px`,
    height: `${renderHeight}px`,
    backgroundImage: `url(${spriteSheetUrl})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: `-${frame.x * scaleX}px -${frame.y * scaleY}px`,
    backgroundSize: `${meta.imageWidth * scaleX}px ${meta.imageHeight * scaleY}px`,
    imageRendering: 'pixelated',
  };
}

export function toSpriteDirectionFromPlacement(
  orientation: 'horizontal' | 'vertical',
  reverse = false,
): ShipSpriteDirection {
  if (orientation === 'horizontal') return reverse ? 'left' : 'right';
  return reverse ? 'up' : 'down';
}
