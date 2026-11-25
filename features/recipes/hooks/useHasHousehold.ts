import { useEffect, useState } from "react";
import { hasHousehold } from "../services/recipe-sharing.service";

/**
 * Si se puede ofrecer compartir con la familia. Mientras se pregunta, o si no se
 * pudo saber, false: la receta se guarda como personal (SPEC 17.5).
 */
export const useHasHousehold = (): boolean => {
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    hasHousehold()
      .then((hasOne) => {
        if (!isCancelled) setIsMember(hasOne);
      })
      .catch(() => {
        // Sin la opción de compartir; guardar sigue funcionando.
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return isMember;
};
