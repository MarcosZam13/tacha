// Fotos que la app deja subir (perfil y recetas). Los buckets de Storage repiten
// la lista (036 y 059): esto es para avisar antes de mandar.

// Extensión del archivo según el tipo MIME; las claves son además la lista de tipos permitidos.
export const IMAGE_FILE_EXTENSION_BY_MIME_TYPE: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Valor del atributo `accept` del selector de archivos.
export const IMAGE_FILE_ACCEPT = Object.keys(IMAGE_FILE_EXTENSION_BY_MIME_TYPE).join(",");
