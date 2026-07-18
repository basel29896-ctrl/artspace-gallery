import sharp from 'sharp';

export const MAX_DISPLAY_EDGE = 1600;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;

const WATERMARK_OPACITY = 0.16;
const WATERMARK_ANGLE_DEG = -30;
/** Tile size relative to the display width — controls how dense the mark repeats. */
const TILE_RATIO = 0.34;

export type DisplayRendition = {
  buffer: Buffer;
  width: number;
  height: number;
  format: 'webp';
};

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!,
  );
}

/**
 * A single tile containing the mark, repeated across the whole canvas via
 * <pattern>. Tiling (rather than one corner stamp) means the watermark cannot
 * be cropped away without destroying the composition.
 */
function tiledWatermarkSvg(text: string, width: number, height: number) {
  const tile = Math.max(Math.round(width * TILE_RATIO), 120);
  const fontSize = Math.max(Math.round(tile * 0.11), 12);
  const label = escapeXml(text);

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <pattern id="wm" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse"
                 patternTransform="rotate(${WATERMARK_ANGLE_DEG})">
          <text x="0" y="${Math.round(tile / 2)}"
                font-family="Helvetica, Arial, sans-serif"
                font-size="${fontSize}" font-weight="600" letter-spacing="${fontSize * 0.18}"
                fill="#ffffff" fill-opacity="${WATERMARK_OPACITY}">${label}</text>
          <text x="0" y="${Math.round(tile / 2) + 1}"
                font-family="Helvetica, Arial, sans-serif"
                font-size="${fontSize}" font-weight="600" letter-spacing="${fontSize * 0.18}"
                fill="#000000" fill-opacity="${WATERMARK_OPACITY * 0.55}">${label}</text>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#wm)"/>
    </svg>`,
  );
}

/**
 * Build the only rendition that is ever served to clients: resized to at most
 * MAX_DISPLAY_EDGE on its longest side, watermarked, and stripped of all
 * metadata (EXIF can carry GPS coordinates and camera serial numbers).
 *
 * The original buffer is never returned from here and must not be made public.
 */
export async function buildDisplayRendition(
  input: Buffer,
  watermarkText: string,
): Promise<DisplayRendition> {
  const base = sharp(input, { failOn: 'error' }).rotate(); // honour EXIF orientation before stripping it

  const meta = await base.metadata();
  if (!meta.width || !meta.height) {
    throw new Error('Unreadable image: missing dimensions');
  }

  const resized = await base
    .resize({
      width: MAX_DISPLAY_EDGE,
      height: MAX_DISPLAY_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toBuffer({ resolveWithObject: true });

  const { width, height } = resized.info;

  const buffer = await sharp(resized.data)
    .composite([{ input: tiledWatermarkSvg(watermarkText, width, height), blend: 'over' }])
    .webp({ quality: 80, effort: 4 })
    .toBuffer();

  return { buffer, width, height, format: 'webp' };
}

/** Validates that the bytes really are an image of an accepted type. */
export async function assertSupportedImage(input: Buffer) {
  const { format } = await sharp(input).metadata();
  const ok = ['jpeg', 'png', 'webp', 'avif'].includes(format ?? '');
  if (!ok) {
    throw new Error(`Unsupported image format: ${format ?? 'unknown'}`);
  }
  return format!;
}
