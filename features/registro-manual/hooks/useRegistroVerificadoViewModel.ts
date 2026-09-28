import { useEffect, useRef, useState } from "react";
import { VERIFICATION_LINK_STATUS } from "../constants/registro.constants";
import type { VerificationLinkStatusType } from "../constants/registro.constants";
import type { RegistroVerificadoViewModel } from "../models/RegistroVerificadoViewModel.interface";
import { getVerificationLinkStatus } from "../utils/getVerificationLinkStatus";

export const useRegistroVerificadoViewModel = (): RegistroVerificadoViewModel => {
  const [linkStatus, setLinkStatus] = useState<VerificationLinkStatusType>(
    VERIFICATION_LINK_STATUS.CHECKING,
  );
  // En desarrollo React corre el efecto dos veces; la segunda ya no vería el fragmento (se borra).
  const firstReadStatus = useRef<VerificationLinkStatusType | undefined>(undefined);

  useEffect(() => {
    firstReadStatus.current ??= getVerificationLinkStatus(window.location.hash);
    const status = firstReadStatus.current;

    // El fragmento trae tokens de sesión: se borra de la URL para que no queden en el historial
    // ni se copien al compartir la dirección.
    window.history.replaceState(null, "", window.location.pathname);

    setLinkStatus(status);
  }, []);

  return { linkStatus };
};