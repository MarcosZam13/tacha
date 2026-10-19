import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HOUSEHOLD_MEMBERS_TEXT, HOUSEHOLD_REMOVE_MEMBER_TEXT } from "../constants/household.constants";

// El aviso final vive en la zona role="status" de la pantalla: buscarlo solo
// ahí comprueba también que se anuncia (SPEC §9), como en HouseholdLeave.page.ts.
const SCREEN_STATUS_SELECTOR = '[role="status"]';

/**
 * Page Object de eliminar a un integrante (SCRUM-61): los botones de las filas,
 * el diálogo de confirmación y el aviso. Un solo Page Object porque el diálogo
 * solo existe dentro de esta pantalla. Sin aserciones: las hace el test.
 */
export const createHouseholdRemoveMemberPage = () => {
  const user = userEvent.setup();

  // Sección y filas.
  const getSection = () => screen.getByRole("region", { name: HOUSEHOLD_MEMBERS_TEXT.TITLE });
  // La sección aparece cuando la pantalla terminó de leer la membresía.
  const findSection = () => screen.findByRole("region", { name: HOUSEHOLD_MEMBERS_TEXT.TITLE });
  const getSectionTitle = () => screen.getByRole("heading", { level: 2, name: HOUSEHOLD_MEMBERS_TEXT.TITLE });
  const findRow = async (label: string) => within(await findSection()).findByText(label);
  const queryRow = (label: string) => within(getSection()).queryByText(label);
  // Nombre accesible "Eliminar integrante {nombre}" (SPEC §9).
  const getRemoveButton = (label: string) =>
    within(getSection()).getByRole("button", { name: `${HOUSEHOLD_REMOVE_MEMBER_TEXT.ACTION} ${label}` });
  const findRemoveButton = async (label: string) =>
    within(await findSection()).findByRole("button", { name: `${HOUSEHOLD_REMOVE_MEMBER_TEXT.ACTION} ${label}` });
  const queryRemoveButton = (label: string) =>
    within(getSection()).queryByRole("button", { name: `${HOUSEHOLD_REMOVE_MEMBER_TEXT.ACTION} ${label}` });
  const queryAllRemoveButtons = () =>
    within(getSection()).queryAllByRole("button", { name: new RegExp(`^${HOUSEHOLD_REMOVE_MEMBER_TEXT.ACTION}`, "u") });

  // Diálogo.
  const getDialog = () => screen.getByRole("dialog", { name: HOUSEHOLD_REMOVE_MEMBER_TEXT.DIALOG_TITLE });
  const queryDialog = () => screen.queryByRole("dialog", { name: HOUSEHOLD_REMOVE_MEMBER_TEXT.DIALOG_TITLE });
  const getConfirmButton = () => within(getDialog()).getByRole("button", { name: HOUSEHOLD_REMOVE_MEMBER_TEXT.CONFIRM });
  const getCancelButton = () => within(getDialog()).getByRole("button", { name: HOUSEHOLD_REMOVE_MEMBER_TEXT.CANCEL });
  const getDialogError = () => within(getDialog()).getByRole("alert");
  const findDialogError = () => within(getDialog()).findByRole("alert");

  // Aviso de la pantalla.
  const findNotice = (notice: string) => screen.findByText(notice, { selector: SCREEN_STATUS_SELECTOR });
  const queryNotice = (notice: string) => screen.queryByText(notice, { selector: SCREEN_STATUS_SELECTOR });

  const requestRemoval = async (label: string) => {
    await user.click(await findRemoveButton(label));
  };
  const confirm = async () => {
    await user.click(getConfirmButton());
  };
  const cancel = async () => {
    await user.click(getCancelButton());
  };
  const pressEscape = async () => {
    await user.keyboard("{Escape}");
  };

  return {
    cancel,
    confirm,
    findDialogError,
    findNotice,
    findRemoveButton,
    findRow,
    getCancelButton,
    getConfirmButton,
    getDialog,
    getDialogError,
    getRemoveButton,
    getSectionTitle,
    pressEscape,
    queryAllRemoveButtons,
    queryDialog,
    queryNotice,
    queryRemoveButton,
    queryRow,
    requestRemoval,
  };
};
