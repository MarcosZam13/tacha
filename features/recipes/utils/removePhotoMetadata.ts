import { IMAGE_FILE_EXTENSION_BY_MIME_TYPE } from "@/constants";
import { RECIPE_PHOTO_REENCODE } from "../constants/recipes.constants";
import { validateRecipePhoto } from "./validateRecipePhoto";

const toBlob = (canvas: HTMLCanvasElement, type: string): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("El navegador no pudo guardar la foto"))),
      type,
      RECIPE_PHOTO_REENCODE.QUALITY,
    );
  });

/**
 * La misma foto sin metadatos (ubicación incluida): se dibuja en un canvas, con
 * su orientación ya aplicada, y se vuelve a codificar (SPEC regla 71). Lanza si
 * el navegador no puede o si el resultado no se puede subir.
 *
 * El tipo sale del resultado: Safari devuelve PNG cuando se le pide WebP.
 */
export const removePhotoMetadata = async (file: Blob): Promise<File> => {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  try {
    const scale = Math.min(1, RECIPE_PHOTO_REENCODE.MAX_SIDE_PIXELS / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d");
    if (!context) throw new Error("El navegador no pudo dibujar la foto");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await toBlob(canvas, file.type);
    const cleanFile = new File([blob], `foto.${IMAGE_FILE_EXTENSION_BY_MIME_TYPE[blob.type]}`, { type: blob.type });
    const fileError = validateRecipePhoto(cleanFile);
    if (fileError) throw new Error(fileError);

    return cleanFile;
  } finally {
    bitmap.close();
  }
};
