import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FINANCE_TEXT } from "../constants/finance.constants";

/**
 * Page Object de Finanzas: los componentes sueltos y, en la etapa 7, la
 * pantalla completa. Sin aserciones: las hace el test.
 */
export const createFinanceDashboardPage = () => {
  const user = userEvent.setup();

  // Pantalla.
  const getTitle = () => screen.getByRole("heading", { level: 1, name: FINANCE_TEXT.TITLE });
  // La zona que anuncia el total y "Presupuesto guardado" (la del Spinner no tiene aria-live).
  const getStatusRegion = () =>
    screen.getAllByRole("status").find((region) => region.getAttribute("aria-live") === "polite");
  const findText = (text: string | RegExp) => screen.findByText(text);
  const queryText = (text: string | RegExp) => screen.queryByText(text);

  // Sin cuenta.
  const findNoAccountNotice = () => screen.findByText(FINANCE_TEXT.NO_ACCOUNT);
  const queryNoAccountNotice = () => screen.queryByText(FINANCE_TEXT.NO_ACCOUNT);
  const getLoginLink = () => screen.getByRole("link", { name: FINANCE_TEXT.LOGIN });

  // Selector de periodo.
  const getPeriodGroup = () => screen.getByRole("group", { name: FINANCE_TEXT.PERIOD_GROUP_LABEL });
  const queryPeriodGroup = () => screen.queryByRole("group", { name: FINANCE_TEXT.PERIOD_GROUP_LABEL });
  const findPeriodGroup = () => screen.findByRole("group", { name: FINANCE_TEXT.PERIOD_GROUP_LABEL });
  const getPeriodButton = (label: string) => within(getPeriodGroup()).getByRole("button", { name: label });
  const choosePeriod = async (label: string) => {
    await user.click(getPeriodButton(label));
  };

  // Errores y reintento.
  const getAlert = () => screen.getByRole("alert");
  const queryAlert = () => screen.queryByRole("alert");
  const getRetryButton = () => screen.getByRole("button", { name: FINANCE_TEXT.RETRY });
  const retry = async () => {
    await user.click(getRetryButton());
  };

  // Presupuesto.
  const getBudgetActionButton = (actionLabel: string) => screen.getByRole("button", { name: actionLabel });
  const queryBudgetActionButton = (actionLabel: string) => screen.queryByRole("button", { name: actionLabel });
  const getBudgetInput = (inputLabel: string) => screen.getByRole("textbox", { name: inputLabel });
  const queryBudgetInput = (inputLabel: string) => screen.queryByRole("textbox", { name: inputLabel });
  const getSaveButton = () => screen.getByRole("button", { name: FINANCE_TEXT.SAVE });
  const getSavingButton = () => screen.getByRole("button", { name: FINANCE_TEXT.SAVING });
  const getCancelButton = () => screen.getByRole("button", { name: FINANCE_TEXT.CANCEL });

  const openBudget = async (actionLabel: string) => {
    await user.click(getBudgetActionButton(actionLabel));
  };
  const typeBudget = async (inputLabel: string, text: string) => {
    await user.type(getBudgetInput(inputLabel), text);
  };
  const save = async () => {
    await user.click(getSaveButton());
  };
  const cancel = async () => {
    await user.click(getCancelButton());
  };
  const pressKey = async (key: string) => {
    await user.keyboard(key);
  };

  return {
    cancel,
    choosePeriod,
    findNoAccountNotice,
    findPeriodGroup,
    findText,
    getAlert,
    getStatusRegion,
    getTitle,
    queryPeriodGroup,
    queryText,
    getBudgetActionButton,
    getBudgetInput,
    getCancelButton,
    getLoginLink,
    getPeriodButton,
    getPeriodGroup,
    getRetryButton,
    getSaveButton,
    getSavingButton,
    openBudget,
    pressKey,
    queryAlert,
    queryBudgetActionButton,
    queryBudgetInput,
    queryNoAccountNotice,
    retry,
    save,
    typeBudget,
  };
};
