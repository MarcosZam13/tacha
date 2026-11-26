import { expect, test } from "@playwright/test";
import {
  COMPLETE_SIGN_UP_PATH,
  LIST_PATH,
  signInAsNewSocialUser,
  stubNewSocialAccount,
} from "./complete-sign-up.helpers";

// Escenarios: features/social-sign-up/specs/E2E.md (SCRUM-43 y SCRUM-44). Los textos se escriben
// acá a propósito (oráculo independiente del código, playwright-e2e).
const NAME_FIELD = /^Nombre/u;
const PROVIDER_NAME = "Ana Pérez";
const TERMS_CHECKBOX = "Acepto los términos y condiciones";
const TERMS_PATH = "/terminos";

test.describe("Completar el registro social", () => {
  test("E2E-SOCIAL-04 — Un nombre vacío no se guarda", async ({ page }) => {
    const saveRequests = await stubNewSocialAccount(page, PROVIDER_NAME);
    await signInAsNewSocialUser(page, PROVIDER_NAME);
    await page.goto(COMPLETE_SIGN_UP_PATH);

    const nameField = page.getByRole("textbox", { name: NAME_FIELD });
    await expect(nameField).toHaveValue(PROVIDER_NAME);
    await page.getByRole("checkbox", { name: TERMS_CHECKBOX }).click();
    await nameField.fill("");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByText("El nombre es obligatorio.")).toBeVisible();
    await expect(page).toHaveURL(COMPLETE_SIGN_UP_PATH);
    expect(saveRequests).toHaveLength(0);
  });

  test("E2E-SOCIAL-05 — Guardar el nombre lleva a la lista", async ({ page }) => {
    const saveRequests = await stubNewSocialAccount(page, PROVIDER_NAME);
    await signInAsNewSocialUser(page, PROVIDER_NAME);
    await page.goto(COMPLETE_SIGN_UP_PATH);

    await page.getByRole("textbox", { name: NAME_FIELD }).fill("Ana María");
    await page.getByRole("checkbox", { name: TERMS_CHECKBOX }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL(LIST_PATH);
    expect(saveRequests).toHaveLength(1);
    const savedData = saveRequests[0].postDataJSON().data;
    expect(savedData.name).toBe("Ana María");
    expect(savedData.terms_accepted_at).toEqual(expect.any(String));
    expect(savedData.social_sign_up_completed_at).toEqual(expect.any(String));
  });

  test("E2E-SOCIAL-06 — Una cuenta sin completar no entra a la app", async ({ page }) => {
    await stubNewSocialAccount(page, PROVIDER_NAME);
    await signInAsNewSocialUser(page, PROVIDER_NAME);

    await page.goto(LIST_PATH);

    await expect(page).toHaveURL(COMPLETE_SIGN_UP_PATH);
    await expect(page.getByRole("heading", { name: "Completa tu registro" })).toBeVisible();
  });

  test("E2E-SOCIAL-07 — Sin aceptar los términos no se completa el registro", async ({ page }) => {
    const saveRequests = await stubNewSocialAccount(page, PROVIDER_NAME);
    await signInAsNewSocialUser(page, PROVIDER_NAME);
    await page.goto(COMPLETE_SIGN_UP_PATH);

    const termsCheckbox = page.getByRole("checkbox", { name: TERMS_CHECKBOX });
    await expect(termsCheckbox).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Ver términos y condiciones" })).toHaveAttribute("href", TERMS_PATH);

    await page.goto(LIST_PATH);

    await expect(page).toHaveURL(COMPLETE_SIGN_UP_PATH);
    expect(saveRequests).toHaveLength(0);
  });

  test("E2E-SOCIAL-08 — Volver desde los términos regresa al formulario", async ({ page }) => {
    await stubNewSocialAccount(page, PROVIDER_NAME);
    await signInAsNewSocialUser(page, PROVIDER_NAME);
    await page.goto(COMPLETE_SIGN_UP_PATH);

    await page.getByRole("link", { name: "Ver términos y condiciones" }).click();
    await expect(page).toHaveURL(TERMS_PATH);
    await page.getByRole("button", { name: "← Volver" }).click();

    await expect(page).toHaveURL(COMPLETE_SIGN_UP_PATH);
    await expect(page.getByRole("heading", { name: "Completa tu registro" })).toBeVisible();
  });
});
