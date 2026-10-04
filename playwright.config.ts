import { defineConfig, devices } from "@playwright/test";

// Pruebas de punta a punta (skill playwright-e2e). Corren contra la app real
// en un navegador real, y la app habla con la base compartida de Supabase.

const DEFAULT_BASE_URL = "http://localhost:3000";
const WEB_SERVER_TIMEOUT_MS = 120_000;
const CI_RETRIES = 2;

const isCI = Boolean(process.env.CI);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? CI_RETRIES : 0,
  workers: isCI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  // Los dos proyectos usan Chromium: alcanza con `npx playwright install chromium`.
  // El de celular importa porque Tacha se usa en el súper, desde el teléfono.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
  // Sin PLAYWRIGHT_BASE_URL, Playwright levanta `npm run dev` solo (o reusa el
  // que ya esté corriendo en local).
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: DEFAULT_BASE_URL,
        reuseExistingServer: !isCI,
        timeout: WEB_SERVER_TIMEOUT_MS,
      },
});
