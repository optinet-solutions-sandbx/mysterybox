/**
 * Prepares a product photo in the browser before upload, so staff can drop in any picture:
 * trims transparent (or plain white) edges, scales the longest side to at most 1200 px, and saves
 * WebP where the browser can (PNG otherwise). Returns the file and its aspect ratio, which the
 * site uses to give every piece the same visual size.
 */

const MAX_SIDE = 1200;

export interface PreparedPhoto {
  photo: Blob;
  aspect: number;
  width: number;
  height: number;
  /** False for photos on a solid background; the site looks best with cut-outs. */
  transparent: boolean;
}

export async function prepareProductPhoto(file: File): Promise<PreparedPhoto> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file (PNG, WebP or JPEG).");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const full = document.createElement("canvas");
  full.width = w;
  full.height = h;
  const ctx = full.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This browser can't prepare images.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const box = contentBox(ctx.getImageData(0, 0, w, h));
  const out = document.createElement("canvas");
  out.width = box.width;
  out.height = box.height;
  out.getContext("2d")!.drawImage(full, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);

  const photo = (await toBlob(out, "image/webp", 0.9)) ?? (await toBlob(out, "image/png"));
  if (!photo) throw new Error("Couldn't prepare the image.");
  return { photo, aspect: box.width / box.height, width: box.width, height: box.height, transparent: box.transparent };
}

/** The smallest rectangle holding everything that isn't transparent (or, for photos without transparency, near-white). */
function contentBox({ data, width, height }: ImageData) {
  let transparent = false;
  for (let i = 3; i < data.length; i += 4 * 97) if (data[i] < 250) transparent = true;
  const isContent = transparent
    ? (i: number) => data[i + 3] > 12
    : (i: number) => data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245;

  let top = height, left = width, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isContent((y * width + x) * 4)) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (right < 0) return { x: 0, y: 0, width, height, transparent };
  const pad = 2;
  const x = Math.max(0, left - pad);
  const y = Math.max(0, top - pad);
  return { x, y, width: Math.min(width, right + pad + 1) - x, height: Math.min(height, bottom + pad + 1) - y, transparent };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b && b.type === type ? b : null), type, quality));
}
