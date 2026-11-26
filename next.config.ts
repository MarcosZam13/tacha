import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El indicador de `next dev` (la "N") va abajo a la izquierda por defecto,
  // justo encima del tab "General" de la barra de celular: tapa el tab e
  // intercepta los clics de los E2E (E2E-SHELL-01 en mobile-chrome, SCRUM-158).
  // Arriba a la izquierda solo cubre la marca, que no es un enlace en la app.
  // Solo existe en desarrollo; en producción no se dibuja.
  devIndicators: { position: "top-left" },
};

export default nextConfig;
