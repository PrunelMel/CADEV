import africa from "../data/africa.json";
import world from "../data/world.json";

// The mask covers the whole world in equirectangular projection.
export const MASK_RECT = { minLon: -180, maxLat: 90, spanLon: 360, spanLat: 180 };

export interface LandMask {
  canvas: HTMLCanvasElement;
  /** True on African land (markers only go there). */
  isAfrica: (lon: number, lat: number) => boolean;
}

// Red channel: all land (Natural Earth 1:110m), used by the globe.
// Green channel: Africa (1:50m), used by the flat map and the markers.
export function createLandMask(width = 4096): LandMask {
  const height = width / 2;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  const sx = width / MASK_RECT.spanLon;
  const sy = height / MASK_RECT.spanLat;
  const fillRings = (rings: number[][], color: string) => {
    ctx.fillStyle = color;
    for (const ring of rings) {
      ctx.beginPath();
      for (let i = 0; i < ring.length; i += 2) {
        const x = (ring[i] - MASK_RECT.minLon) * sx;
        // Antarctica's outline stops short of the pole: push its bottom edge down.
        const lat = ring[i + 1] < -84 ? -90 : ring[i + 1];
        const y = (MASK_RECT.maxLat - lat) * sy;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
  };

  fillRings(world as number[][], "#f00");
  ctx.globalCompositeOperation = "lighter";
  fillRings(africa as number[][], "#0f0");
  ctx.globalCompositeOperation = "source-over";

  const pixels = ctx.getImageData(0, 0, width, height).data;
  const isAfrica = (lon: number, lat: number) => {
    const x = Math.floor((lon - MASK_RECT.minLon) * sx);
    const y = Math.floor((MASK_RECT.maxLat - lat) * sy);
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    return pixels[(y * width + x) * 4 + 1] > 127;
  };

  return { canvas, isAfrica };
}
