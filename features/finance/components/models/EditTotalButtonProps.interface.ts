/** El lápiz de un total (SCRUM-91, SPEC §8 y §9), con solo lo que dibuja. */
export interface EditTotalButtonProps {
  /** Mientras otro total se guarda, los demás lápices quedan deshabilitados (D21). */
  isDisabled: boolean;
  /** Nombre propio: "Editar total del domingo 18 de octubre, MaxiPali", "Editar total de esta semana". */
  label: string;
  onClick: () => void;
}
