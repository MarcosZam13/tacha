import { PHOTO_METADATA_PATTERN } from "../constants/recipes.constants";

/** Si el archivo parece llevar metadatos. Sirve para no volver a comprimir una foto ya limpia. */
export const hasPhotoMetadata = async (file: Blob): Promise<boolean> => {
  // latin1: un carácter por byte, así se buscan los nombres dentro del binario.
  const content = new TextDecoder("latin1").decode(await file.arrayBuffer());

  return PHOTO_METADATA_PATTERN.test(content);
};
