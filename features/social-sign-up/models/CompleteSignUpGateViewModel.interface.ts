export interface CompleteSignUpGateViewModel {
  /** Todavía no llegó la sesión: se muestra el indicador de carga. */
  isChecking: boolean;
  /** La cuenta tiene que completar el registro: no se muestra nada mientras va al formulario. */
  isRedirecting: boolean;
}
