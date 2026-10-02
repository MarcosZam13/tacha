// Valores de process.env.NODE_ENV que la app distingue.
export const NODE_ENV = {
  PRODUCTION: "production",
} as const;

// Las rutas de (debug) y (demo) son herramientas de desarrollo: no se publican en producción.
export const IS_DEV_TOOLS_ENABLED = process.env.NODE_ENV !== NODE_ENV.PRODUCTION;
