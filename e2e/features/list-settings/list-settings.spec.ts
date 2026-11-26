import { expect, test } from "@playwright/test";
import {
  BETO_ID,
  COLD_START_TEST_TIMEOUT_MS,
  GENERAL_LIST_ID,
  PROFILE_PATH,
  SETTINGS_PATH,
  SUBLIST_PATH,
  getAssigneeField,
  getAssigneePicker,
  getAssigneeSwitch,
  hasHorizontalOverflow,
  signInAsRegisteredUser,
  stubListSettingsSupabase,
  warmUpRoutes,
} from "./list-settings.helpers";

// Escenarios E2E-CONF-01 a 05: features/list-settings/specs/E2E.md.
// Validan la INTERFAZ con una sesión y respuestas de Supabase simuladas; no la RLS, ni las RPC reales, ni el
// trigger (eso lo cubre la prueba SQL 047). Los textos se escriben acá a propósito (oráculo independiente del
// código, playwright-e2e).
const GENERAL_LABEL = "Lista general";
const SUBLIST_LABEL = "Cumple de Ana · 20/12/2099";
const SAVE_ERROR = "No se pudo guardar el ajuste. Intenta de nuevo.";

test.describe("Configuración: el encargado por lista (SCRUM-108)", () => {
  test.describe.configure({ timeout: COLD_START_TEST_TIMEOUT_MS });

  test.beforeAll(async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext({ baseURL });
    await warmUpRoutes(request);
    await request.dispose();
  });

  test.beforeEach(async ({ page }) => {
    await signInAsRegisteredUser(page);
  });

  test("E2E-CONF-01 — Del perfil a Configuración y encender el ajuste de una lista", async ({ page }) => {
    const recorder = await stubListSettingsSupabase(page, { assigneeEnabledOnSublist: true });
    await page.goto(PROFILE_PATH);

    await page.getByRole("link", { name: "Configuración", exact: true }).click();

    await expect(page).toHaveURL(SETTINGS_PATH);
    await expect(page.getByRole("heading", { name: "Configuración", exact: true })).toBeVisible();
    // Cada lista tiene su propio interruptor: la general apagada por defecto y la sublista como se dejó.
    await expect(getAssigneeSwitch(page, GENERAL_LABEL)).toHaveAttribute("aria-checked", "false");
    await expect(getAssigneeSwitch(page, SUBLIST_LABEL)).toHaveAttribute("aria-checked", "true");

    await getAssigneeSwitch(page, GENERAL_LABEL).click();

    await expect(getAssigneeSwitch(page, GENERAL_LABEL)).toHaveAttribute("aria-checked", "true");
    expect(recorder.settingRequests).toEqual([{ enabled: true, listId: GENERAL_LIST_ID }]);
    // La otra lista no cambió, y el ajuste sigue al recargar.
    await expect(getAssigneeSwitch(page, SUBLIST_LABEL)).toHaveAttribute("aria-checked", "true");
    await page.reload();
    await expect(getAssigneeSwitch(page, GENERAL_LABEL)).toHaveAttribute("aria-checked", "true");
  });

  test("E2E-CONF-02 — Con el ajuste encendido, la fila muestra el campo y se elige al encargado", async ({ page }) => {
    const recorder = await stubListSettingsSupabase(page, { assigneeEnabledOnSublist: true });
    await page.goto(SUBLIST_PATH);

    await expect(getAssigneeField(page, "Sin asignar")).toBeVisible();
    await getAssigneeField(page, "Sin asignar").click();

    // El selector: "Sin asignar" y las personas de la lista, con la persona de la sesión marcada.
    const picker = getAssigneePicker(page);
    await expect(picker.getByRole("button")).toHaveText(["Sin asignar", "Ana (tú)", "Beto", "Cancelar"]);
    await picker.getByRole("button", { name: "Beto", exact: true }).click();

    await expect(picker).toBeHidden();
    await expect(getAssigneeField(page, "Beto")).toBeVisible();
    expect(recorder.assigneeRequests).toEqual([{ assigneeId: BETO_ID, itemId: expect.any(String) }]);

    // Elegir "Sin asignar" lo quita.
    await getAssigneeField(page, "Beto").click();
    await getAssigneePicker(page).getByRole("button", { name: "Sin asignar", exact: true }).click();
    await expect(getAssigneeField(page, "Sin asignar")).toBeVisible();
    expect(recorder.assigneeRequests.at(-1)?.assigneeId).toBeNull();
  });

  test("E2E-CONF-03 — Con el ajuste apagado la fila no muestra el campo", async ({ page }) => {
    await stubListSettingsSupabase(page, { assigneeEnabledOnSublist: false });
    await page.goto(SUBLIST_PATH);

    await expect(page.getByText("Leche entera", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Encargado: /u })).toHaveCount(0);
  });

  test("E2E-CONF-04 — Apagar el ajuste no borra al encargado: al encenderlo vuelve", async ({ page }) => {
    await stubListSettingsSupabase(page, { assigneeEnabledOnSublist: true, assignedTo: BETO_ID });
    await page.goto(SUBLIST_PATH);
    await expect(getAssigneeField(page, "Beto")).toBeVisible();

    await page.goto(SETTINGS_PATH);
    await getAssigneeSwitch(page, SUBLIST_LABEL).click();
    await expect(getAssigneeSwitch(page, SUBLIST_LABEL)).toHaveAttribute("aria-checked", "false");
    await page.goto(SUBLIST_PATH);
    await expect(page.getByText("Leche entera", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Encargado: /u })).toHaveCount(0);

    await page.goto(SETTINGS_PATH);
    await getAssigneeSwitch(page, SUBLIST_LABEL).click();
    await expect(getAssigneeSwitch(page, SUBLIST_LABEL)).toHaveAttribute("aria-checked", "true");
    await page.goto(SUBLIST_PATH);
    await expect(getAssigneeField(page, "Beto")).toBeVisible();
  });

  test("E2E-CONF-05 — Si falla al guardar, el interruptor no cambia y se avisa junto a la lista", async ({ page }) => {
    const recorder = await stubListSettingsSupabase(page, { failSettingSave: true });
    await page.goto(SETTINGS_PATH);

    await getAssigneeSwitch(page, GENERAL_LABEL).click();

    // Next.js agrega su propio role="alert" (el anunciador de rutas): se busca por el texto.
    await expect(page.getByRole("alert").filter({ hasText: SAVE_ERROR })).toBeVisible();
    await expect(getAssigneeSwitch(page, GENERAL_LABEL)).toHaveAttribute("aria-checked", "false");
    expect(recorder.settingRequests).toEqual([{ enabled: true, listId: GENERAL_LIST_ID }]);
  });

  test("E2E-CONF-06 — Configuración y el selector caben en la pantalla, sin scroll horizontal", async ({ page }) => {
    await stubListSettingsSupabase(page, { assigneeEnabledOnSublist: true });
    await page.goto(SETTINGS_PATH);
    await expect(getAssigneeSwitch(page, SUBLIST_LABEL)).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);

    await page.goto(SUBLIST_PATH);
    await getAssigneeField(page, "Sin asignar").click();
    await expect(getAssigneePicker(page)).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });
});

