import { useEffect, useState } from "react";
import { consumeInactivityNotice } from "../services/inactivity-notice.service";

/**
 * ¿Se llegó al login porque la sesión se cerró por inactividad? Lee la bandera una vez al montar
 * y la guarda en estado: consumirla la borra, y el aviso debe seguir visible mientras se escribe.
 * Se lee en un efecto (no al renderizar) porque sessionStorage no existe en el servidor.
 */
export const useInactivityNoticeViewModel = (): boolean => {
  const [shouldShowNotice, setShouldShowNotice] = useState(false);

  useEffect(() => {
    // En desarrollo StrictMode corre este efecto dos veces: la segunda ya no encuentra la bandera
    // (se borró en la primera), por eso solo se enciende el estado y nunca se apaga.
    // Leer sessionStorage solo se puede en el navegador, después de montar: no hay forma de
    // evitar el setState en el efecto sin una diferencia entre el HTML del servidor y el cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (consumeInactivityNotice()) setShouldShowNotice(true);
  }, []);

  return shouldShowNotice;
};
