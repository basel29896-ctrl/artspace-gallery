import { drawPerspective } from './renderPerspective';
import type { Quad } from './homography';

/**
 * Stamps a visible credit onto the exported composite.
 *
 * This is attribution, not protection — anyone can crop it. It matters because
 * the artwork pixels inside the export came from the already-watermarked
 * display rendition, so the tiled server-side mark is baked in regardless of
 * what happens to this one.
 */
export function stampExportWatermark(
  canvas: HTMLCanvasElement,
  lines: { title: string; artist: string },
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Any prior transform on this context (Konva leaves a devicePixelRatio scale
  // on canvases it hands back) would push the stamp off the bottom edge.
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const pad = Math.round(Math.min(canvas.width, canvas.height) * 0.03);
  const fontSize = Math.max(Math.round(canvas.width * 0.022), 13);

  ctx.save();
  ctx.textBaseline = 'bottom';

  const label = `${lines.title} — ${lines.artist}`;
  const credit = 'Preview via ArtSpace · not for reproduction';

  ctx.font = `600 ${fontSize}px Helvetica, Arial, sans-serif`;
  const labelWidth = ctx.measureText(label).width;
  ctx.font = `400 ${Math.round(fontSize * 0.72)}px Helvetica, Arial, sans-serif`;
  const creditWidth = ctx.measureText(credit).width;

  const boxWidth = Math.max(labelWidth, creditWidth) + pad * 1.5;
  const boxHeight = fontSize * 2.9;
  const boxX = pad;
  const boxY = canvas.height - pad - boxHeight;

  // Scrim so the text stays legible over any room photo.
  ctx.fillStyle = 'rgba(15,12,10,0.55)';
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.font = `600 ${fontSize}px Helvetica, Arial, sans-serif`;
  ctx.fillText(label, boxX + pad * 0.75, boxY + boxHeight * 0.58);

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = `400 ${Math.round(fontSize * 0.72)}px Helvetica, Arial, sans-serif`;
  ctx.fillText(credit, boxX + pad * 0.75, boxY + boxHeight * 0.92);

  ctx.restore();
}

/**
 * Composes the export independently of the Konva stage.
 *
 * Going through `stage.toCanvas()` was wrong twice over: it baked the editing
 * chrome (corner handles, selection outline) into the customer's image, and it
 * upscaled a stage-sized raster rather than re-rendering, which made the
 * triangle seams visible. Here the room is drawn at its native resolution and
 * the artwork is re-warped at that scale.
 */
export function renderExportComposite(options: {
  room: HTMLImageElement;
  framedArtwork: HTMLCanvasElement;
  quad: Quad;
  /** Stage dimensions the quad coordinates are expressed in. */
  stageWidth: number;
  stageHeight: number;
  shadow: boolean;
  maxWidth?: number;
}): HTMLCanvasElement | null {
  const { room, framedArtwork, quad, stageWidth, stageHeight, shadow } = options;
  const maxWidth = options.maxWidth ?? 2400;

  const width = Math.min(room.naturalWidth || stageWidth, maxWidth);
  const scale = width / stageWidth;
  const height = Math.round(stageHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width);
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(room, 0, 0, canvas.width, canvas.height);

  const scaled = quad.map((p) => ({ x: p.x * scale, y: p.y * scale })) as Quad;

  if (shadow) {
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.filter = `blur(${Math.round(14 * scale)}px)`;
    ctx.fillStyle = 'rgba(20,15,10,1)';
    ctx.beginPath();
    ctx.moveTo(scaled[0].x + 10 * scale, scaled[0].y + 14 * scale);
    for (let i = 1; i < 4; i += 1) {
      ctx.lineTo(scaled[i].x + 10 * scale, scaled[i].y + 14 * scale);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const drawn = drawPerspective(
    ctx,
    framedArtwork,
    framedArtwork.width,
    framedArtwork.height,
    scaled,
  );
  if (!drawn) return null;

  return canvas;
}

export function downloadCanvasAsJpeg(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Revoke on the next tick — revoking synchronously can cancel the download.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    'image/jpeg',
    0.9,
  );
}
