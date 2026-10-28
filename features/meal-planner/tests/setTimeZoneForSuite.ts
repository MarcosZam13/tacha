import { afterAll, beforeAll } from "vitest";

/**
 * Fija la zona horaria del navegador simulado para los tests del bloque
 * `describe` donde se llama, y la restaura al terminar. Node la toma de
 * process.env.TZ, así que se fija antes de crear cada fecha. Sirve para
 * comprobar el día local (Costa Rica, UTC-6) y el cambio de hora de verano
 * (Nueva York), que en otra zona no se notarían.
 */
export const setTimeZoneForSuite = (timeZone: string): void => {
  const originalTimeZone = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = timeZone;
  });

  afterAll(() => {
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  });
};
