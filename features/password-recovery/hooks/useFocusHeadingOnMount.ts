import { useEffect, useRef } from "react";
import type { NullableRef } from "@/types/nullable.types";

/**
 * Devuelve un ref para un título que recibe el foco al montarse. Al reemplazar el formulario por la
 * confirmación, el botón que tenía el foco desaparece y el foco caería en el body: así el lector de
 * pantalla y el teclado empiezan en el título nuevo. (Copia de la del login: pasa a `hooks/` compartido
 * cuando se toque esa feature.)
 */
export const useFocusHeadingOnMount = (): React.RefObject<NullableRef<HTMLHeadingElement>> => {
  const elementRef = useRef<NullableRef<HTMLHeadingElement>>(null);

  // Sincroniza con el DOM (mover el foco), por eso es un efecto.
  useEffect(() => {
    elementRef.current?.focus();
  }, []);

  return elementRef;
};
