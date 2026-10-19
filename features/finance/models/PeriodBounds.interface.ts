/**
 * Límites de un periodo en hora local (SPEC regla 8): `start` incluido y `end`
 * excluido, los dos a las 00:00. El servicio los manda a la base en ISO (UTC).
 */
export interface PeriodBounds {
  end: Date;
  start: Date;
}
