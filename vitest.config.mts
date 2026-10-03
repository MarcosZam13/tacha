import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Runner de tests unitarios (unit-testing-standards). Los tests viven en el
// tests/ de cada feature y se corren con `npm test`.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mismo alias que tsconfig.json: "@/..." es la raíz del proyecto.
    alias: { "@": import.meta.dirname },
  },
  test: {
    // Por defecto Node: las funciones puras no necesitan navegador y así
    // arrancan mucho más rápido. Un test de componente lo pide arriba del
    // archivo con el comentario `// @vitest-environment jsdom`.
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    // Las Edge Functions son Deno, no Node (igual que en tsconfig y eslint).
    exclude: ["node_modules/**", ".next/**", "supabase/functions/**"],
  },
});
