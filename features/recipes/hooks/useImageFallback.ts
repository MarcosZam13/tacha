import { useState } from "react";
import type { NullableRef } from "@/types/nullable.types";

interface ImageFallback {
  onImageError: () => void;
  /** La URL que se puede dibujar; null si no hay o no cargó. */
  visibleUrl: NullableRef<string>;
}

/**
 * Qué imagen se puede mostrar. Recuerda la URL que falló y no un sí/no: si llega
 * otra (una foto nueva), se vuelve a intentar sin un efecto que limpie el estado.
 */
export const useImageFallback = (url: NullableRef<string>): ImageFallback => {
  const [failedUrl, setFailedUrl] = useState<NullableRef<string>>(null);

  return {
    onImageError: () => setFailedUrl(url),
    visibleUrl: url === failedUrl ? null : url,
  };
};
