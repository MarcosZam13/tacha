/**
 * Medianoche del día local de `date`, en ISO (UTC). Es el "hoy" de "Tachados
 * hoy": se calcula en el navegador porque la base está en UTC y en Costa Rica
 * (UTC-6) su "hoy" cambiaría a las 6 p. m.
 */
export const startOfLocalDay = (date: Date): string =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
