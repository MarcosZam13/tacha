import { useEffect, useState } from "react";
import { isHouseholdMember } from "@/services/household-membership.service";

/**
 * Si se puede ofrecer lo de la familia. Mientras se pregunta, o si no se
 * pudo saber, false: se usa solo lo personal.
 */
export const useHasHousehold = (): boolean => {
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    isHouseholdMember()
      .then((hasOne) => {
        if (!isCancelled) setIsMember(hasOne);
      })
      .catch(() => {
        // Sin las opciones de la familia; lo personal sigue funcionando.
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return isMember;
};
