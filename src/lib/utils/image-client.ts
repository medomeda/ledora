/** Redimensionne une image côté navigateur et la renvoie en data URL (phase simulée : pas de stockage de fichiers). */
export async function resizeImage(file: File, maxSize: number, quality = 0.85): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Le fichier doit être une image.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Image trop lourde (8 Mo maximum).");
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", quality);
}
