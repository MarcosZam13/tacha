import { screen, within } from "@testing-library/react";
import { HOUSEHOLD_LEAVE_TEXT, HOUSEHOLD_TEXT } from "../constants/household.constants";

// El aviso final vive en la zona role="status" de la pantalla: buscarlo solo
// ahí comprueba también que el lector de pantalla lo anuncia (SPEC §9).
const STATUS_REGION_SELECTOR = '[role="status"]';

/**
 * Page Object del flujo de salir de la familia: la sección de la pantalla
 * "Mi familia", su diálogo de confirmación y lo que se ve después de salir.
 * Un solo Page Object porque el diálogo solo existe dentro de esta pantalla
 * (unit-testing-standards: las acciones del hijo van en el del padre).
 * Sin aserciones: las hace el test.
 */
export const createHouseholdLeavePage = () => {
  // Pantalla.
  const getLeaveHeading = () => screen.getByRole("heading", { name: HOUSEHOLD_LEAVE_TEXT.LEAVE });
  const findLeaveButton = () => screen.findByRole("button", { name: HOUSEHOLD_LEAVE_TEXT.LEAVE });
  const queryLeaveButton = () => screen.queryByRole("button", { name: HOUSEHOLD_LEAVE_TEXT.LEAVE });
  const findCreateTitle = () => screen.findByRole("heading", { name: HOUSEHOLD_TEXT.CREATE_TITLE });
  const findNotice = (notice: string) => screen.findByText(notice, { selector: STATUS_REGION_SELECTOR });
  const queryNotice = (notice: string) => screen.queryByText(notice, { selector: STATUS_REGION_SELECTOR });

  // Diálogo.
  const getDialog = () => screen.getByRole("dialog");
  const queryDialog = () => screen.queryByRole("dialog");
  const getConfirmButton = () => within(getDialog()).getByRole("button", { name: HOUSEHOLD_LEAVE_TEXT.CONFIRM });
  // El mismo botón mientras sale ("Saliendo…").
  const getLeavingButton = () => within(getDialog()).getByRole("button", { name: HOUSEHOLD_LEAVE_TEXT.LEAVING });
  const queryConfirmButton = () => within(getDialog()).queryByRole("button", { name: HOUSEHOLD_LEAVE_TEXT.CONFIRM });
  const getCancelButton = () => within(getDialog()).getByRole("button", { name: HOUSEHOLD_LEAVE_TEXT.CANCEL });
  const getNewAdminGroup = () => within(getDialog()).getByRole("group", { name: HOUSEHOLD_LEAVE_TEXT.NEW_ADMIN_LEGEND });
  const queryNewAdminGroup = () =>
    within(getDialog()).queryByRole("group", { name: HOUSEHOLD_LEAVE_TEXT.NEW_ADMIN_LEGEND });
  const getNewAdminOption = (label: string) => within(getDialog()).getByRole("radio", { name: label });
  // Los radios llegan cuando responde la carga de miembros.
  const findNewAdminOption = (label: string) => screen.findByRole("radio", { name: label });
  const getNewAdminOptions = () => within(getDialog()).queryAllByRole("radio");
  const getDialogError = () => within(getDialog()).getByRole("alert");
  const findDialogError = () => within(getDialog()).findByRole("alert");
  const findDialogText = (text: string) => within(getDialog()).findByText(text);
  const getDialogLoading = () => within(getDialog()).getByRole("status");

  return {
    findCreateTitle,
    findDialogError,
    findDialogText,
    findLeaveButton,
    findNewAdminOption,
    findNotice,
    getCancelButton,
    getConfirmButton,
    getDialog,
    getDialogError,
    getDialogLoading,
    getLeaveHeading,
    getLeavingButton,
    getNewAdminGroup,
    getNewAdminOption,
    getNewAdminOptions,
    queryConfirmButton,
    queryDialog,
    queryLeaveButton,
    queryNewAdminGroup,
    queryNotice,
  };
};
