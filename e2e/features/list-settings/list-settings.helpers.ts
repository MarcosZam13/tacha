import type { APIRequestContext, Locator, Page } from "@playwright/test";
import { PUBLIC_ORIGIN_PATH, buildFakeUser, signInAsFakeUser } from "../../support/fake-session";
import { getRequiredEnv } from "../../support/supabase";

// Cómo preparar y encontrar las cosas de Configuración y del campo "Encargado". Sin aserciones: eso es del test
// (playwright-e2e, references/standards.md). Escenarios y datos: features/list-settings/specs/E2E.md.
//
// Todo lo de Supabase se responde desde el test: estos escenarios validan la interfaz, NO la autenticación real
// ni la seguridad de la base (E2E.md).

export const PROFILE_PATH = "/perfil";
export const SETTINGS_PATH = "/perfil/configuracion";

// Ids inventados (no son de la base). El usuario simulado es el de fake-session.ts.
export const GENERAL_LIST_ID = "00000000-0000-4000-8000-0000000000a1";
export const SUBLIST_ID = "00000000-0000-4000-8000-0000000000a2";
export const SUBLIST_PATH = `/fechas/${SUBLIST_ID}`;
const ITEM_ID = "00000000-0000-4000-8000-0000000000b1";
const VARIANT_ID = "00000000-0000-4000-8000-0000000000b2";
export const ANA_ID = String(buildFakeUser().id);
export const BETO_ID = "00000000-0000-4000-8000-0000000000c2";

const SUBLIST_NAME = "Cumple de Ana";
const SUBLIST_DATE = "2099-12-20";
const OK_STATUS = 200;
const SERVER_ERROR_STATUS = 500;
const SERVER_ERROR = { code: "XX000", message: "Error simulado" };

// Con el servidor de desarrollo en frío, compilar las rutas tarda; como en finance.
export const COLD_START_TEST_TIMEOUT_MS = 90_000;

/** Pide las rutas antes de empezar: compiladas, no hay una recarga en medio del test. */
export const warmUpRoutes = async (request: APIRequestContext): Promise<void> => {
  for (const path of [PUBLIC_ORIGIN_PATH, PROFILE_PATH, SETTINGS_PATH, SUBLIST_PATH]) {
    await request.get(path);
  }
};

/** La sesión registrada simulada de e2e/support (is_anonymous: false). */
export const signInAsRegisteredUser = signInAsFakeUser;

export interface ListSettingsStubOptions {
  /** El ajuste de la sublista al empezar; la lista general empieza apagada (sin fila). */
  assigneeEnabledOnSublist?: boolean;
  /** El encargado del producto de la sublista al empezar. */
  assignedTo?: string;
  /** Guardar el interruptor responde con un error. */
  failSettingSave?: boolean;
}

export interface ListSettingsRecorder {
  assigneeRequests: { assigneeId: string | null; itemId: string }[];
  settingRequests: { enabled: boolean; listId: string }[];
}

/**
 * Responde desde el test lo que piden Configuración y el detalle de la sublista. El estado (el ajuste de cada lista
 * y el encargado del producto) vive en el stub: sobrevive a un `goto`, como la base. Cualquier otra petición a
 * Supabase responde `[]`.
 */
export const stubListSettingsSupabase = async (
  page: Page,
  options: ListSettingsStubOptions = {},
): Promise<ListSettingsRecorder> => {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const recorder: ListSettingsRecorder = { assigneeRequests: [], settingRequests: [] };
  const settings = new Map<string, boolean>();
  if (options.assigneeEnabledOnSublist !== undefined) settings.set(SUBLIST_ID, options.assigneeEnabledOnSublist);
  let assignedTo: string | null = options.assignedTo ?? null;

  const toSettingsRow = (listId: string): { assignee_enabled: boolean } | null => {
    const isEnabled = settings.get(listId);
    return isEnabled === undefined ? null : { assignee_enabled: isEnabled };
  };

  await page.route(`${supabaseUrl}/**`, async (route) => {
    const request = route.request();
    const { pathname, searchParams } = new URL(request.url());
    const select = searchParams.get("select") ?? "";

    // Configuración: las listas con su ajuste embebido.
    if (pathname.endsWith("/rest/v1/lists") && select.includes("list_settings(")) {
      return route.fulfill({
        json: [
          { event_date: null, household_id: null, id: GENERAL_LIST_ID, list_settings: toSettingsRow(GENERAL_LIST_ID), name: null, type: "general" },
          { event_date: SUBLIST_DATE, household_id: null, id: SUBLIST_ID, list_settings: toSettingsRow(SUBLIST_ID), name: SUBLIST_NAME, type: "date" },
        ],
        status: OK_STATUS,
      });
    }

    // Detalle de la sublista, con un producto.
    if (pathname.endsWith("/rest/v1/lists") && select.includes("list_items(")) {
      return route.fulfill({
        json: [
          {
            event_date: SUBLIST_DATE,
            id: SUBLIST_ID,
            list_items: [
              {
                created_at: "2099-01-01T00:00:00Z",
                id: ITEM_ID,
                product_catalog_variants: {
                  base_quantity: 1000,
                  base_unit: "ml",
                  id: VARIANT_ID,
                  product_catalog: { name: "Leche entera" },
                },
                quantity_requested: 1,
              },
            ],
            name: SUBLIST_NAME,
            status: "active",
          },
        ],
        status: OK_STATUS,
      });
    }

    // El campo "Encargado": el ajuste de la lista, los encargados y las personas elegibles.
    if (pathname.endsWith("/rest/v1/list_settings")) {
      const listId = (searchParams.get("list_id") ?? "").replace("eq.", "");
      const row = toSettingsRow(listId);
      return route.fulfill({ json: row ? [row] : [], status: OK_STATUS });
    }

    if (pathname.endsWith("/rest/v1/list_items") && select.includes("assigned_to")) {
      return route.fulfill({ json: assignedTo ? [{ assigned_to: assignedTo, id: ITEM_ID }] : [], status: OK_STATUS });
    }

    if (pathname.endsWith("/rest/v1/rpc/get_list_assignee_candidates")) {
      return route.fulfill({
        json: [
          { display_name: "Ana", is_current_user: true, user_id: ANA_ID },
          { display_name: "Beto", is_current_user: false, user_id: BETO_ID },
        ],
        status: OK_STATUS,
      });
    }

    if (pathname.endsWith("/rest/v1/rpc/set_list_assignee_enabled")) {
      const { enabled, target_list_id: listId } = request.postDataJSON() as { enabled: boolean; target_list_id: string };
      recorder.settingRequests.push({ enabled, listId });
      if (options.failSettingSave) return route.fulfill({ json: SERVER_ERROR, status: SERVER_ERROR_STATUS });
      settings.set(listId, enabled);
      return route.fulfill({ json: { assignee_enabled: enabled, list_id: listId }, status: OK_STATUS });
    }

    if (pathname.endsWith("/rest/v1/rpc/set_list_item_assignee")) {
      const { new_assignee: assigneeId, target_item_id: itemId } = request.postDataJSON() as {
        new_assignee: string | null;
        target_item_id: string;
      };
      recorder.assigneeRequests.push({ assigneeId, itemId });
      assignedTo = assigneeId;
      return route.fulfill({ json: { assigned_to: assigneeId, id: itemId }, status: OK_STATUS });
    }

    return route.fulfill({ json: [], status: OK_STATUS });
  });

  return recorder;
};

/** El interruptor "Encargado" de una lista de Configuración. */
export const getAssigneeSwitch = (page: Page, listLabel: string): Locator =>
  page.getByRole("switch", { name: `Encargado, ${listLabel}`, exact: true });

/** El campo "Encargado" de la fila de un producto, por lo que dice. */
export const getAssigneeField = (page: Page, assigneeName: string): Locator =>
  page.getByRole("button", { name: `Encargado: ${assigneeName}. Cambiar`, exact: true });

export const getAssigneePicker = (page: Page): Locator => page.getByRole("dialog", { name: "Elegir encargado" });

export const hasHorizontalOverflow = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
