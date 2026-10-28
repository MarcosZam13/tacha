import type { Locator, Page, Request, Route } from "@playwright/test";
import { buildFakeUser } from "../../support/fake-session";
import { getRequiredEnv } from "../../support/supabase";

// Cómo preparar y encontrar las cosas de la vista de actualización de contraseña. Sin aserciones: eso es
// del test (playwright-e2e, references/standards.md). Los textos que son contrato del escenario no viven
// acá: se escriben en el spec.

// Un enlace de recuperación como el que deja Supabase en el fragmento de la URL (flujo implícito).
export const RECOVERY_FRAGMENT =
  "#access_token=fake-recovery-token&refresh_token=fake-refresh-token&expires_in=3600&token_type=bearer&type=recovery";
// Lo que Supabase deja en la URL cuando el enlace venció o ya se usó.
export const EXPIRED_FRAGMENT =
  "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";

// Lo que responde Supabase Auth a "guardar la nueva contraseña".
export const UPDATE_RESPONSE = {
  NETWORK_FAILURE: "network-failure",
  SAME_PASSWORD: "same-password",
  SUCCESS: "success",
} as const;

export type UpdateResponse = (typeof UPDATE_RESPONSE)[keyof typeof UPDATE_RESPONSE];

const SUCCESS_STATUS = 200;
const NO_CONTENT_STATUS = 204;
const UNPROCESSABLE_STATUS = 422;
const SAME_PASSWORD_BODY = {
  code: UNPROCESSABLE_STATUS,
  error_code: "same_password",
  msg: "New password should be different from the old password.",
};

const USER_PATH = "/auth/v1/user";
const LOGOUT_PATH = "/auth/v1/logout";

// Lo que el test ve que hizo la pantalla, en el orden en que lo hizo.
export const RECOVERY_EVENT = {
  REVOKE_OTHERS: "revoke-others",
  SIGN_OUT_LOCAL: "sign-out-local",
  UPDATE: "update",
} as const;

export type RecoveryEventType = (typeof RECOVERY_EVENT)[keyof typeof RECOVERY_EVENT];

const OTHERS_SCOPE = "others";
const SERVER_ERROR_STATUS = 500;

export interface RecoveryRequests {
  /** Lo que hizo la pantalla, en orden: cerrar las otras sesiones, guardar, cerrar la de recuperación. */
  events: RecoveryEventType[];
  /** Peticiones de "guardar la nueva contraseña" (PUT /auth/v1/user). */
  updates: Request[];
}

export interface RecoveryStubOptions {
  /** `false`: el servidor falla al cerrar las otras sesiones. Por defecto lo logra. */
  revokeSucceeds?: boolean;
  /** Respuesta a cada intento de guardar (la última se repite). Por defecto, éxito. */
  updateResponses?: UpdateResponse[];
}

const respondToUpdate = (route: Route, response: UpdateResponse): Promise<void> =>
  response === UPDATE_RESPONSE.NETWORK_FAILURE
    ? route.abort("failed")
    : response === UPDATE_RESPONSE.SAME_PASSWORD
      ? route.fulfill({
          status: UNPROCESSABLE_STATUS,
          contentType: "application/json",
          body: JSON.stringify(SAME_PASSWORD_BODY),
        })
      : route.fulfill({
          status: SUCCESS_STATUS,
          contentType: "application/json",
          body: JSON.stringify(buildFakeUser()),
        });

/**
 * Hace de Supabase para la vista de actualización: confirma el usuario del enlace (GET /auth/v1/user),
 * responde cada intento de guardar con la siguiente respuesta de la lista, y contesta los cierres de sesión
 * (el de las otras sesiones y el local). Nada llega a la base. Devuelve lo que la pantalla fue haciendo, para
 * comprobar qué se mandó y en qué orden.
 */
export const stubSupabaseForRecovery = async (
  page: Page,
  { revokeSucceeds = true, updateResponses = [UPDATE_RESPONSE.SUCCESS] }: RecoveryStubOptions = {},
): Promise<RecoveryRequests> => {
  const received: RecoveryRequests = { events: [], updates: [] };

  await page.route(`${getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL")}/**`, (route) => {
    const request = route.request();
    const { pathname, searchParams } = new URL(request.url());

    if (pathname.endsWith(USER_PATH) && request.method() === "PUT") {
      const response = updateResponses[Math.min(received.updates.length, updateResponses.length - 1)];
      received.updates.push(request);
      received.events.push(RECOVERY_EVENT.UPDATE);
      return respondToUpdate(route, response);
    }
    if (pathname.endsWith(USER_PATH)) {
      return route.fulfill({
        status: SUCCESS_STATUS,
        contentType: "application/json",
        body: JSON.stringify(buildFakeUser()),
      });
    }
    if (pathname.includes(LOGOUT_PATH)) {
      const isRevokingOthers = searchParams.get("scope") === OTHERS_SCOPE;
      received.events.push(isRevokingOthers ? RECOVERY_EVENT.REVOKE_OTHERS : RECOVERY_EVENT.SIGN_OUT_LOCAL);

      return isRevokingOthers && !revokeSucceeds
        ? route.fulfill({
            status: SERVER_ERROR_STATUS,
            contentType: "application/json",
            body: JSON.stringify({ code: SERVER_ERROR_STATUS, msg: "Internal error" }),
          })
        : route.fulfill({ status: NO_CONTENT_STATUS });
    }
    return route.fulfill({ status: SUCCESS_STATUS, contentType: "application/json", body: "{}" });
  });

  return received;
};

export const getNewPasswordField = (page: Page): Locator => page.getByLabel(/^Nueva contraseña/);

export const getConfirmPasswordField = (page: Page): Locator => page.getByLabel(/^Repetir nueva contraseña/);

export const getSaveButton = (page: Page): Locator => page.getByRole("button", { name: "Guardar contraseña" });

/** Escribe la nueva contraseña y su repetición. */
export const fillNewPassword = async (page: Page, password: string, confirmation = password): Promise<void> => {
  await getNewPasswordField(page).fill(password);
  await getConfirmPasswordField(page).fill(confirmation);
};
