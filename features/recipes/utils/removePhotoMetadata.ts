import { IMAGE_FILE_EXTENSION_BY_MIME_TYPE } from "@/constants";
import { RECIPE_PHOTO_MAX_FILE_SIZE_BYTES, RECIPE_PHOTO_REENCODE } from "../constants/recipes.constants";
import { validateRecipePhoto } from "./validateRecipePhoto";

// Los errores de acá no se muestran: quien sube la foto los traduce a "la foto no se guardó".
const toBlob = (canvas: HTMLCanvasElement, type: string): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error(type))), type, RECIPE_PHOTO_REENCODE.QUALITY);
  });

/**
 * La misma foto sin metadatos (ubicación incluida): se dibuja en un canvas, con
 * su orientación ya aplicada, y se vuelve a codificar (SPEC regla 71). Lanza si
 * el navegador no puede o si el resultado no se puede subir.
 *
 * El tipo sale del resultado: Safari devuelve PNG cuando se le pide WebP. Si así
 * pesa demasiado, se guarda como JPEG.
 */
export const removePhotoMetadata = async (file: Blob): Promise<File> => {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  try {
    const scale = Math.min(1, RECIPE_PHOTO_REENCODE.MAX_SIDE_PIXELS / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d");
    if (!context) throw new Error(file.type);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const sameTypeBlob = await toBlob(canvas, file.type);
    const blob =
      sameTypeBlob.size > RECIPE_PHOTO_MAX_FILE_SIZE_BYTES
        ? await toBlob(canvas, RECIPE_PHOTO_REENCODE.FALLBACK_TYPE)
        : sameTypeBlob;

    const extension = IMAGE_FILE_EXTENSION_BY_MIME_TYPE[blob.type];
    const cleanFile = new File([blob], `${RECIPE_PHOTO_REENCODE.FILE_NAME}.${extension}`, { type: blob.type });
    const fileError = validateRecipePhoto(cleanFile);
    if (fileError) throw new Error(fileError);

    return cleanFile;
  } finally {
    bitmap.close();
  }
};
