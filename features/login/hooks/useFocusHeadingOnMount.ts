import { useEffect, useRef } from "react";
import type { NullableRef } from "@/types/nullable.types";

/**
 * Devuelve un ref para un título que recibe el foco al montarse el componente. Sirve para que, al reemplazar
 * una pantalla por otra, el lector de pantalla y el teclado empiecen en el título nuevo.
 */
export const useFocusHeadingOnMount = (): React.RefObject<NullableRef<HTMLHeadingElement>> => {
  const elementRef = useRef<NullableRef<HTMLHeadingElement>>(null);

  // Sincroniza con el DOM (mover el foco), por eso es un efecto.
  useEffect(() => {
    elementRef.current?.focus();
  }, []);

  return elementRef;
};
