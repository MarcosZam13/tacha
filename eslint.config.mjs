import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import playwright from "eslint-plugin-playwright";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Baseline mecánico de estilo, ver .agents/skills/nextjs-enterprise-patterns/SKILL.md §5.
    rules: {
      "no-console": "error",
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: "error",
      "consistent-return": "error",
      "no-shadow": "error",
      "default-param-last": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Deno runtime (Edge Functions) — ver tsconfig.json, no comparte reglas
    // con el programa TS/ESLint de Next.js.
    "supabase/functions/**",
    // Salidas de Playwright (npm run e2e).
    "test-results/**",
    "playwright-report/**",
    "blob-report/**",
  ]),
  // Pruebas de punta a punta: reglas de Playwright (ej. no olvidar el await de
  // una aserción, no usar sleeps fijos). Ver .agents/skills/playwright-e2e.
  {
    files: ["e2e/**/*.ts"],
    ...playwright.configs["flat/recommended"],
    rules: {
      ...playwright.configs["flat/recommended"].rules,
      // Los fixtures de Playwright se llaman `use`, y eslint-plugin-react-hooks
      // los confunde con un hook de React.
      "react-hooks/rules-of-hooks": "off",
    },
  },
]);

export default eslintConfig;
