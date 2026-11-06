/**
 * Límites de un periodo en hora local (SPEC regla 8): `start` incluido y `end`
 * excluido, los dos a las 00:00 de la zona del navegador o, con zona guardada,
 * de esa zona (SCRUM-91, regla 58). El servicio los manda a la base en ISO (UTC).
 */
export interface PeriodBounds {
  end: Date;
  start: Date;
}
