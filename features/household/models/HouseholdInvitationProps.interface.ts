/** Lo que recibe la página de invitación desde la ruta /invitacion/[token]. */
export interface HouseholdInvitationProps {
  /** El segmento de la URL tal como llegó; el ViewModel revisa su formato. */
  token: string;
}
