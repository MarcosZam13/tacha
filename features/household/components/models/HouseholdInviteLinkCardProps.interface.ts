/** Lo que la tarjeta dibuja; useHouseholdViewModel lo arma a partir de useHouseholdInvite. */
export interface HouseholdInviteLinkCardProps {
  /** Fecha de vencimiento ya formateada ("8 de octubre de 2026 a las 10:01 p. m."). */
  expiryDateText: string;
  /** "Vence" o "Venció". */
  expiryLabel: string;
  /** Vencido según el reloj del navegador (solo para mostrar; la base decide la validez). */
  isExpired: boolean;
  /** Se está generando un link nuevo: los botones quedan deshabilitados. */
  isGenerating: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
  /** "Generar nuevo enlace" o "Generando…". */
  regenerateLabel: string;
  /** "Activo" o "Expirado". */
  statusLabel: string;
  /** Link completo: `<origen>/invitacion/<token>`. */
  url: string;
}
