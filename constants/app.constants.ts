// Valores de process.env.NODE_ENV que la app distingue.
export const NODE_ENV = {
  PRODUCTION: "production",
} as const;

// Las rutas de (debug) y (demo) son herramientas de desarrollo: no se publican en producción.
// Las cortan proxy.ts (antes de renderizar) y los layouts de cada grupo (segunda capa).
export const IS_DEV_TOOLS_ENABLED = process.env.NODE_ENV !== NODE_ENV.PRODUCTION;

// Códigos HTTP que la app responde (proxy.ts) o revisa en respuestas de Supabase (registro).
export const HTTP_STATUS = {
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
} as const;
