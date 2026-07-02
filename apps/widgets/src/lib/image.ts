/**
 * Convierte un archivo de imagen en una data URL, reescalando si es grande.
 *
 * Los widgets corren en OBS cargando una URL (sin servidor), así que la imagen
 * se embebe como data URL. Para que la URL no quede enorme, se reescala a
 * `maxDim` px del lado más largo y se exporta en WebP (conserva transparencia).
 */
export async function fileToDataUrl(file: File, maxDim = 1000): Promise<string> {
  const original = await readAsDataUrl(file);
  const img = await loadImage(original);

  const longest = Math.max(img.width, img.height);
  const scale = longest > 0 ? Math.min(1, maxDim / longest) : 1;
  if (scale >= 1) return original; // ya es suficientemente chica

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return original;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const webp = canvas.toDataURL('image/webp', 0.85);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = src;
  });
}
