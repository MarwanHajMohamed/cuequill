// Read an image File and return a downscaled data URL. Strategy
// examples are stored inline in the document (same approach as
// trade-note images), so we cap dimensions and re-encode to keep each
// image small enough that a strategy with many examples stays well
// under MongoDB's 16MB document limit.
export async function fileToDownscaledDataUrl(
  file: File,
  { maxDim = 1600, quality = 0.82 }: { maxDim?: number; quality?: number } = {},
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not decode image"));
    el.src = dataUrl;
  });

  const { width, height } = img;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  // Already small enough and not a re-encodable raster we need to shrink.
  if (scale >= 1 && file.size < 600_000) return dataUrl;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // PNGs with transparency would lose it as JPEG; keep PNG for those,
  // otherwise JPEG compresses screenshots far better.
  const isPng = file.type === "image/png";
  return canvas.toDataURL(isPng ? "image/png" : "image/jpeg", quality);
}
