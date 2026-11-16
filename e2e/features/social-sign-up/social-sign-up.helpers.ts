import type { Page } from "@playwright/test";

// Cómo simular a Google y Facebook. Sin aserciones: eso es del test
// (playwright-e2e, references/standards.md).
export const REGISTER_PATH = "/registro";
export const CALLBACK_PATH = "/registro/social";

const AUTHORIZE_URL = "**/auth/v1/authorize**";

/** Los proveedores son de terceros: el flujo vuelve a la app como si la persona hubiera cancelado. */
export const stubProviderCancellation = async (page: Page): Promise<string[]> => {
  const authorizeUrls: string[] = [];

  await page.route(AUTHORIZE_URL, (route) => {
    authorizeUrls.push(route.request().url());
    return route.fulfill({
      headers: { location: `${new URL(page.url()).origin}${CALLBACK_PATH}?error=access_denied` },
      status: 302,
    });
  });

  return authorizeUrls;
};
