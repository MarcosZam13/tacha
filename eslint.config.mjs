import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
  ]),
]);

export default eslintConfig;
