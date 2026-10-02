import {
  VERIFICATION_LINK_PARAM,
  VERIFICATION_LINK_STATUS,
} from "../constants/registro.constants";
import type { VerificationLinkStatusType } from "../constants/registro.constants";

// Supabase vuelve a la app con el resultado en el fragmento de la URL:
// "#access_token=...&type=signup" si el enlace sirvió, "#error=access_denied&error_code=otp_expired..."
// si expiró o ya se usó. Sin fragmento (entrar directo a la ruta) tampoco es un enlace válido.
export const getVerificationLinkStatus = (hash: string): VerificationLinkStatusType => {
  const params = new URLSearchParams(hash.slice(1));

  return params.has(VERIFICATION_LINK_PARAM.ERROR) ||
    !params.has(VERIFICATION_LINK_PARAM.ACCESS_TOKEN)
    ? VERIFICATION_LINK_STATUS.INVALID
    : VERIFICATION_LINK_STATUS.CONFIRMED;
};