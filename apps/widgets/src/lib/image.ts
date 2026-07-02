/**
 * Convierte un archivo de imagen en una data URL comprimida.
 *
 * Los widgets corren en OBS cargando una URL (sin servidor), así que la imagen
 * se embebe como data URL dentro de la URL del widget. Para que esa URL no se
 * dispare (y rompa la navegación), SIEMPRE reescalamos a `maxDim` px y
 * recomprimimos en WebP (conserva transparencia).
 */
export async function fileToDataUrl(file: File, maxDim = 800): Promise<string> {
  const original = await readAsDataUrl(file);
  const img = await loadImage(original);

  const longest = Math.max(img.width, img.height) || 1;
  const scale = Math.min(1, maxDim / longest);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return original;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const webp = canvas.toDataURL('image/webp', 0.8);
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
