/**
 * El link de invitación del household, listo para dibujar. Lo devuelve
 * household.service.ts a partir de lo que responden create_household_invite y
 * get_household_invite: la pantalla nunca ve el token suelto ni la fila de la base.
 */
export interface HouseholdInvite {
  /** Vencimiento fijado por la base (now() + 7 días), en ms desde epoch. */
  expiresAt: number;
  /** `<origen>/invitacion/<token>`. La página que lo abre es HU-34. */
  url: string;
}
