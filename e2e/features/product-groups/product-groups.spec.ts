import { expect, test } from "@playwright/test";
import { deleteOwnListItems } from "../../support/supabase";
import {
  GROUPS_PATH,
  LIST_PATH,
  NEW_GROUP_PATH,
  addFirstOptionOf,
  getAddGroupToListButton,
  getAddGroupToListSummary,
  getBackToListLink,
  getCreateFirstGroupLink,
  getGeneralNavLink,
  getGroupCard,
  getGroupItemRows,
  getGroupNameInput,
  getGroupsEmptyState,
  getGroupsTitle,
  getManageGroupsLink,
  getPendingListRows,
  getSaveGroupButton,
} from "./product-groups.helpers";

// Escenarios: features/product-groups/specs/E2E.md. Cada test arranca con un
// navegador nuevo, o sea un usuario anónimo nuevo sin grupos. Los textos y
// rutas se escriben acá a propósito (oráculo independiente del código).
// Los de HU-72 no crean datos. Los de HU-73 crean grupos de un usuario
// anónimo, que nadie más ve: no hay limpieza. Los de HU-74 escriben en la
// lista general: se limpia al terminar, como en E2E-MISPROD.

test.describe("Mis grupos", () => {
  test("E2E-GRUPOS-01 — Entrar a Mis grupos desde General", async ({ page }) => {
    await page.goto(LIST_PATH);

    await getManageGroupsLink(page).click();

    await expect(page).toHaveURL(GROUPS_PATH);
    await expect(getGroupsTitle(page)).toBeVisible();
    // Es una pantalla secundaria de General: el menú sigue marcando General.
    await expect(getGeneralNavLink(page)).toHaveAttribute("aria-current", "page");
  });

  test("E2E-GRUPOS-02 — Sin grupos se ve el estado vacío y se puede volver", async ({ page }) => {
    await page.goto(GROUPS_PATH);

    await expect(getGroupsEmptyState(page)).toBeVisible();

    await getBackToListLink(page).click();
    await expect(page).toHaveURL(LIST_PATH);
  });
});

test.describe("Crear un grupo", () => {
  test("E2E-GRUPOS-03 — Crear un grupo y verlo en Mis grupos", async ({ page }) => {
    const groupName = `Desayuno ${Date.now()}`;
    await page.goto(GROUPS_PATH);

    await getCreateFirstGroupLink(page).click();
    await expect(page).toHaveURL(NEW_GROUP_PATH);
    await getGroupNameInput(page).fill(groupName);
    const itemLabel = await addFirstOptionOf(page, "leche", "Leche");
    await page.getByRole("button", { name: `Sumar uno a ${itemLabel}` }).click();
    await expect(getGroupItemRows(page)).toHaveCount(1);
    await expect(getGroupItemRows(page).first().getByText("2", { exact: true })).toBeVisible();
    await getSaveGroupButton(page).click();

    await expect(page).toHaveURL(GROUPS_PATH);
    await expect(getGroupCard(page, groupName)).toContainText("1 producto");
  });

  test("E2E-GRUPOS-04 — Quitar un producto antes de guardar", async ({ page }) => {
    const groupName = `Repostería ${Date.now()}`;
    await page.goto(NEW_GROUP_PATH);

    await getGroupNameInput(page).fill(groupName);
    const lecheLabel = await addFirstOptionOf(page, "leche", "Leche");
    await addFirstOptionOf(page, "chocolate", "Chocolate");
    await expect(getGroupItemRows(page)).toHaveCount(2);
    await page.getByRole("button", { name: `Quitar ${lecheLabel}` }).click();
    await expect(getGroupItemRows(page)).toHaveCount(1);
    await expect(getGroupItemRows(page).first()).toContainText("Chocolate");
    await getSaveGroupButton(page).click();

    await expect(page).toHaveURL(GROUPS_PATH);
    await expect(getGroupCard(page, groupName)).toContainText("1 producto");
  });

  test("E2E-GRUPOS-05 — No se guarda sin nombre ni productos", async ({ page }) => {
    await page.goto(NEW_GROUP_PATH);

    await getSaveGroupButton(page).click();

    await expect(page.getByText("Escribe un nombre para el grupo.")).toBeVisible();
    await expect(page.getByText("Agrega al menos un producto.")).toBeVisible();
    await expect(page).toHaveURL(NEW_GROUP_PATH);
  });
});

test.describe("Agregar un grupo a la lista", () => {
  test.afterEach(async ({ page, request }) => {
    await deleteOwnListItems(page, request);
  });

  test("E2E-GRUPOS-06 — Agregar un grupo a la lista y agregarlo otra vez", async ({ page }) => {
    const groupName = `Merienda ${Date.now()}`;
    await page.goto(NEW_GROUP_PATH);
    await getGroupNameInput(page).fill(groupName);
    const lecheLabel = await addFirstOptionOf(page, "leche", "Leche");
    await page.getByRole("button", { name: `Sumar uno a ${lecheLabel}` }).click();
    await addFirstOptionOf(page, "chocolate", "Chocolate");
    await getSaveGroupButton(page).click();
    await expect(page).toHaveURL(GROUPS_PATH);

    await getAddGroupToListButton(page, groupName).click();

    const summary = getAddGroupToListSummary(page, groupName);
    await expect(summary).toContainText(`Agregamos 2 productos de «${groupName}» a tu lista.`);
    await summary.getByRole("link", { name: "Ver lista" }).click();
    await expect(page).toHaveURL(LIST_PATH);
    const rows = getPendingListRows(page);
    await expect(rows).toHaveCount(2);
    await expect(rows.filter({ hasText: "Leche" }).getByText("2", { exact: true })).toBeVisible();
    await expect(rows.filter({ hasText: "Chocolate" }).getByText("1", { exact: true })).toBeVisible();

    // Otra vez: la misma presentación suma en su fila, sin filas nuevas (CA-02).
    await page.goto(GROUPS_PATH);
    await getAddGroupToListButton(page, groupName).click();
    await expect(getAddGroupToListSummary(page, groupName)).toContainText("Agregamos 2 productos");
    await page.goto(LIST_PATH);
    await expect(rows).toHaveCount(2);
    await expect(rows.filter({ hasText: "Leche" }).getByText("4", { exact: true })).toBeVisible();
    await expect(rows.filter({ hasText: "Chocolate" }).getByText("2", { exact: true })).toBeVisible();
  });
});
