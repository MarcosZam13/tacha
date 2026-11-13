// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTH_ROUTE } from "@/constants";
import { EditTotalButton } from "../components/EditTotalButton";
import { FinanceNoAccount } from "../components/FinanceNoAccount";
import { InlineTotalEditor } from "../components/InlineTotalEditor";
import { PeriodAdjustmentRow } from "../components/PeriodAdjustmentRow";
import { PurchaseSessionRow } from "../components/PurchaseSessionRow";
import { SpendingBudget } from "../components/SpendingBudget";
import { SpendingPeriodSelector } from "../components/SpendingPeriodSelector";
import { SpendingTotal } from "../components/SpendingTotal";
import { TimeZoneConfirmation } from "../components/TimeZoneConfirmation";
import type { EditTotalButtonProps } from "../components/models/EditTotalButtonProps.interface";
import type { InlineTotalEditorProps } from "../components/models/InlineTotalEditorProps.interface";
import type { PurchaseSessionRowProps } from "../components/models/PurchaseSessionRowProps.interface";
import type { SpendingBudgetProps } from "../components/models/SpendingBudgetProps.interface";
import type { SpendingTotalProps } from "../components/models/SpendingTotalProps.interface";
import {
  BUDGET_STATUS,
  FINANCE_TEXT,
  SPENDING_PERIOD,
  SPENDING_STATUS,
  TOTAL_EDIT_STATUS,
} from "../constants/finance.constants";
import { createFinanceDashboardPage } from "./FinanceDashboard.page";
import { createPurchaseHistoryPage } from "./PurchaseHistory.page";

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

describe("FinanceNoAccount", () => {
  it("asks to sign in with a real link to the login, without an alert", () => {
    render(<FinanceNoAccount />);
    const page = createFinanceDashboardPage();

    expect(page.queryNoAccountNotice()).toBeInTheDocument();
    expect(page.getLoginLink()).toHaveAttribute("href", AUTH_ROUTE.LOGIN);
    expect(page.queryAlert()).not.toBeInTheDocument();
  });
});

describe("SpendingPeriodSelector", () => {
  const createOptions = (selectedLabel: string, onSelect = vi.fn()) =>
    [
      { label: "Día", period: SPENDING_PERIOD.DAY },
      { label: "Semana", period: SPENDING_PERIOD.WEEK },
      { label: "Mes", period: SPENDING_PERIOD.MONTH },
    ].map((option) => ({ ...option, isSelected: option.label === selectedLabel, onSelect: () => onSelect(option.period) }));

  it("is a named group with Día, Semana and Mes, marking the chosen one (CA-01)", () => {
    render(<SpendingPeriodSelector options={createOptions("Semana")} />);
    const page = createFinanceDashboardPage();

    expect(page.getPeriodButton("Día")).toHaveAttribute("aria-pressed", "false");
    expect(page.getPeriodButton("Semana")).toHaveAttribute("aria-pressed", "true");
    expect(page.getPeriodButton("Mes")).toHaveAttribute("aria-pressed", "false");
  });

  it("chooses a period with a click", async () => {
    const onSelect = vi.fn();
    render(<SpendingPeriodSelector options={createOptions("Semana", onSelect)} />);
    const page = createFinanceDashboardPage();

    await page.choosePeriod("Mes");

    expect(onSelect).toHaveBeenCalledWith(SPENDING_PERIOD.MONTH);
  });

  it("chooses a period with the keyboard", async () => {
    const onSelect = vi.fn();
    render(<SpendingPeriodSelector options={createOptions("Semana", onSelect)} />);
    const page = createFinanceDashboardPage();

    page.getPeriodButton("Día").focus();
    await page.pressKey("{Enter}");

    expect(onSelect).toHaveBeenCalledWith(SPENDING_PERIOD.DAY);
  });
});

describe("SpendingTotal", () => {
  const createProps = (overrides: Partial<SpendingTotalProps> = {}): SpendingTotalProps => ({
    closedCount: 2,
    errorMessage: null,
    label: "Gastado esta semana",
    onRetry: vi.fn(),
    rangeText: "Lunes 12 a domingo 18 de octubre",
    status: SPENDING_STATUS.READY,
    totalText: "₡15 000",
    withoutTotalCount: 1,
    ...overrides,
  });

  it("shows a spinner while loading", () => {
    render(<SpendingTotal {...createProps({ rangeText: null, status: SPENDING_STATUS.LOADING, totalText: null })} />);

    expect(screen.getByRole("status", { name: "Gastado esta semana" })).toBeInTheDocument();
    expect(screen.queryByText("₡15 000")).not.toBeInTheDocument();
  });

  it("shows the total with its label, dates and the purchases without a total apart (CA-02)", () => {
    render(<SpendingTotal {...createProps()} />);

    expect(screen.getByText("Gastado esta semana")).toBeInTheDocument();
    expect(screen.getByText("₡15 000")).toBeInTheDocument();
    expect(screen.getByText("Lunes 12 a domingo 18 de octubre")).toBeInTheDocument();
    expect(screen.getByText(FINANCE_TEXT.PURCHASES).nextSibling).toHaveTextContent("2");
    expect(screen.getByText(FINANCE_TEXT.WITHOUT_TOTAL).nextSibling).toHaveTextContent("1");
  });

  it("shows ₡0 and the empty message without closed purchases", () => {
    render(
      <SpendingTotal {...createProps({ closedCount: 0, status: SPENDING_STATUS.EMPTY, totalText: "₡0", withoutTotalCount: 0 })} />,
    );

    expect(screen.getByText("₡0")).toBeInTheDocument();
    expect(screen.getByText(FINANCE_TEXT.SPENDING_EMPTY)).toBeInTheDocument();
  });

  it("shows the error as an alert and retries", async () => {
    const onRetry = vi.fn();
    render(
      <SpendingTotal
        {...createProps({
          errorMessage: FINANCE_TEXT.SPENDING_LOAD_ERROR,
          onRetry,
          rangeText: null,
          status: SPENDING_STATUS.FAILED,
          totalText: null,
        })}
      />,
    );
    const page = createFinanceDashboardPage();

    expect(page.getAlert()).toHaveTextContent(FINANCE_TEXT.SPENDING_LOAD_ERROR);
    await page.retry();

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("SpendingBudget", () => {
  const INPUT_LABEL = "Presupuesto semanal (₡)";

  const createProps = (overrides: Partial<SpendingBudgetProps> = {}): SpendingBudgetProps => ({
    actionLabel: FINANCE_TEXT.EDIT_BUDGET,
    amountText: "₡50 000",
    differenceText: "Te quedan ₡35 000",
    errorMessage: null,
    inputLabel: INPUT_LABEL,
    label: "Presupuesto semanal",
    noBudgetText: "Sin presupuesto semanal",
    notIncludedText: "No incluye 1 compra sin total",
    onCancel: vi.fn(),
    onEdit: vi.fn(),
    onRetry: vi.fn(),
    onSave: vi.fn(),
    onTextChange: vi.fn(),
    status: BUDGET_STATUS.VIEWING,
    text: "",
    ...overrides,
  });

  it("shows the budget, the difference and what is not included (CA-03)", () => {
    render(<SpendingBudget {...createProps()} />);
    const page = createFinanceDashboardPage();

    expect(screen.getByText("Presupuesto semanal")).toBeInTheDocument();
    expect(screen.getByText("₡50 000")).toBeInTheDocument();
    expect(screen.getByText("Te quedan ₡35 000")).toBeInTheDocument();
    expect(screen.getByText("No incluye 1 compra sin total")).toBeInTheDocument();
    expect(page.getBudgetActionButton(FINANCE_TEXT.EDIT_BUDGET)).toBeEnabled();
  });

  it("offers to define a budget when the period has none", async () => {
    const onEdit = vi.fn();
    render(
      <SpendingBudget
        {...createProps({
          actionLabel: FINANCE_TEXT.DEFINE_BUDGET,
          amountText: null,
          differenceText: null,
          notIncludedText: null,
          onEdit,
        })}
      />,
    );
    const page = createFinanceDashboardPage();

    expect(screen.getByText("Sin presupuesto semanal")).toBeInTheDocument();
    expect(screen.queryByText(/Te quedan|Te pasaste/u)).not.toBeInTheDocument();
    await page.openBudget(FINANCE_TEXT.DEFINE_BUDGET);

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("shows a spinner while loading, without the edit button", () => {
    render(<SpendingBudget {...createProps({ status: BUDGET_STATUS.LOADING })} />);
    const page = createFinanceDashboardPage();

    expect(screen.getByRole("status", { name: "Presupuesto semanal" })).toBeInTheDocument();
    expect(page.queryBudgetActionButton(FINANCE_TEXT.EDIT_BUDGET)).not.toBeInTheDocument();
  });

  it("shows the load error and retries, without allowing to edit", async () => {
    const onRetry = vi.fn();
    render(
      <SpendingBudget
        {...createProps({ errorMessage: FINANCE_TEXT.BUDGET_LOAD_ERROR, onRetry, status: BUDGET_STATUS.LOAD_FAILED })}
      />,
    );
    const page = createFinanceDashboardPage();

    expect(page.getAlert()).toHaveTextContent(FINANCE_TEXT.BUDGET_LOAD_ERROR);
    expect(page.queryBudgetActionButton(FINANCE_TEXT.EDIT_BUDGET)).not.toBeInTheDocument();
    await page.retry();

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("sends what is typed, saves with the button or Enter and cancels with the button or Escape", async () => {
    const callbacks = { onCancel: vi.fn(), onSave: vi.fn(), onTextChange: vi.fn() };
    render(<SpendingBudget {...createProps({ ...callbacks, status: BUDGET_STATUS.EDITING, text: "50000" })} />);
    const page = createFinanceDashboardPage();

    await page.typeBudget(INPUT_LABEL, "1");
    expect(callbacks.onTextChange).toHaveBeenLastCalledWith("500001");

    await page.save();
    await page.pressKey("{Enter}");
    expect(callbacks.onSave).toHaveBeenCalledTimes(2);

    await page.cancel();
    page.getBudgetInput(INPUT_LABEL).focus();
    await page.pressKey("{Escape}");
    expect(callbacks.onCancel).toHaveBeenCalledTimes(2);
  });

  it("ties a validation error to the field, without an alert", () => {
    render(
      <SpendingBudget {...createProps({ errorMessage: FINANCE_TEXT.BUDGET_INVALID, status: BUDGET_STATUS.EDITING, text: "12.5" })} />,
    );
    const page = createFinanceDashboardPage();
    const input = page.getBudgetInput(INPUT_LABEL);

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(FINANCE_TEXT.BUDGET_INVALID);
    expect(page.queryAlert()).not.toBeInTheDocument();
  });

  it("announces a save error and keeps what was written", () => {
    render(
      <SpendingBudget
        {...createProps({ errorMessage: FINANCE_TEXT.BUDGET_SAVE_ERROR, status: BUDGET_STATUS.SAVE_FAILED, text: "30000" })}
      />,
    );
    const page = createFinanceDashboardPage();

    expect(page.getAlert()).toHaveTextContent(FINANCE_TEXT.BUDGET_SAVE_ERROR);
    expect(page.getBudgetInput(INPUT_LABEL)).toHaveValue("30000");
    expect(page.getSaveButton()).toBeEnabled();
  });

  it("disables the field and the buttons while saving", () => {
    render(<SpendingBudget {...createProps({ status: BUDGET_STATUS.SAVING, text: "30000" })} />);
    const page = createFinanceDashboardPage();

    expect(page.getBudgetInput(INPUT_LABEL)).toBeDisabled();
    expect(page.getSavingButton()).toBeDisabled();
    expect(page.getCancelButton()).toBeDisabled();
  });

  describe("focus (SPEC §9)", () => {
    it("moves to the field when it opens", () => {
      const { rerender } = render(<SpendingBudget {...createProps()} />);
      const page = createFinanceDashboardPage();

      rerender(<SpendingBudget {...createProps({ status: BUDGET_STATUS.EDITING, text: "50000" })} />);

      expect(page.getBudgetInput(INPUT_LABEL)).toHaveFocus();
    });

    it("returns to «Editar presupuesto» after saving", () => {
      const { rerender } = render(<SpendingBudget {...createProps({ status: BUDGET_STATUS.EDITING, text: "60000" })} />);
      const page = createFinanceDashboardPage();

      rerender(<SpendingBudget {...createProps({ status: BUDGET_STATUS.SAVING, text: "60000" })} />);
      rerender(<SpendingBudget {...createProps({ amountText: "₡60 000" })} />);

      expect(page.getBudgetActionButton(FINANCE_TEXT.EDIT_BUDGET)).toHaveFocus();
    });

    it("returns to «Editar presupuesto» after cancelling", () => {
      const { rerender } = render(<SpendingBudget {...createProps({ status: BUDGET_STATUS.EDITING, text: "60000" })} />);
      const page = createFinanceDashboardPage();

      rerender(<SpendingBudget {...createProps()} />);

      expect(page.getBudgetActionButton(FINANCE_TEXT.EDIT_BUDGET)).toHaveFocus();
    });

    it("goes back to the field when saving fails", () => {
      const { rerender } = render(<SpendingBudget {...createProps({ status: BUDGET_STATUS.SAVING, text: "30000" })} />);
      const page = createFinanceDashboardPage();

      rerender(
        <SpendingBudget
          {...createProps({ errorMessage: FINANCE_TEXT.BUDGET_SAVE_ERROR, status: BUDGET_STATUS.SAVE_FAILED, text: "30000" })}
        />,
      );

      expect(page.getBudgetInput(INPUT_LABEL)).toHaveFocus();
    });
  });
});

// ----------------------------------------------------------------------------
// Edición de totales (SCRUM-91). Los componentes solo dibujan: qué se valida y
// qué se guarda lo decide useTotalEdit.
// ----------------------------------------------------------------------------

const PURCHASE_PENCIL = "Editar total del domingo 18 de octubre, MaxiPali";
const PURCHASE_INPUT = FINANCE_TEXT.PURCHASE_TOTAL_INPUT_LABEL;

const createEditProps = (overrides: Partial<EditTotalButtonProps> = {}): EditTotalButtonProps => ({
  isDisabled: false,
  label: PURCHASE_PENCIL,
  onClick: vi.fn(),
  ...overrides,
});

const createEditorProps = (overrides: Partial<InlineTotalEditorProps> = {}): InlineTotalEditorProps => ({
  errorMessage: null,
  inputLabel: PURCHASE_INPUT,
  onCancel: vi.fn(),
  onConfirmTimeZone: vi.fn(),
  onSave: vi.fn(),
  onTextChange: vi.fn(),
  status: TOTAL_EDIT_STATUS.EDITING,
  text: "10000",
  timeZoneToConfirm: null,
  ...overrides,
});

describe("EditTotalButton", () => {
  it("is a button with its own name and a decorative icon (SPEC §9)", async () => {
    const onClick = vi.fn();
    render(<EditTotalButton {...createEditProps({ onClick })} />);
    const page = createPurchaseHistoryPage();

    expect(page.getEditButton(PURCHASE_PENCIL)).toHaveTextContent("");
    await page.openEdit(PURCHASE_PENCIL);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does nothing while disabled (D21)", async () => {
    const onClick = vi.fn();
    render(<EditTotalButton {...createEditProps({ isDisabled: true, onClick })} />);
    const page = createPurchaseHistoryPage();

    expect(page.getEditButton(PURCHASE_PENCIL)).toBeDisabled();
    await page.openEdit(PURCHASE_PENCIL);

    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("InlineTotalEditor", () => {
  it("shows the labelled field with its value and takes the focus on opening (SPEC §9)", () => {
    render(<InlineTotalEditor {...createEditorProps()} />);
    const page = createPurchaseHistoryPage();

    expect(page.getTotalInput(PURCHASE_INPUT)).toHaveValue("10000");
    expect(page.getTotalInput(PURCHASE_INPUT)).toHaveFocus();
    expect(page.getTotalInput(PURCHASE_INPUT)).not.toHaveAttribute("aria-invalid");
  });

  it("hands over what is written", async () => {
    const onTextChange = vi.fn();
    render(<InlineTotalEditor {...createEditorProps({ onTextChange, text: "" })} />);
    const page = createPurchaseHistoryPage();

    await page.replaceTotal(PURCHASE_INPUT, "5");

    expect(onTextChange).toHaveBeenLastCalledWith("5");
  });

  it("saves with «Guardar» and with Enter", async () => {
    const onSave = vi.fn();
    render(<InlineTotalEditor {...createEditorProps({ onSave })} />);
    const page = createPurchaseHistoryPage();

    await page.save();
    await page.pressKey("{Enter}");

    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("cancels with «Cancelar» and with Escape", async () => {
    const onCancel = vi.fn();
    render(<InlineTotalEditor {...createEditorProps({ onCancel })} />);
    const page = createPurchaseHistoryPage();

    await page.pressKey("{Escape}");
    await page.cancel();

    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("disables the field and the buttons while saving (rule 56)", () => {
    render(<InlineTotalEditor {...createEditorProps({ status: TOTAL_EDIT_STATUS.SAVING })} />);
    const page = createPurchaseHistoryPage();

    expect(page.getTotalInput(PURCHASE_INPUT)).toBeDisabled();
    expect(page.getSavingButton()).toBeDisabled();
    expect(page.getCancelButton()).toBeDisabled();
    expect(page.getTotalInput(PURCHASE_INPUT).closest("form")).toHaveAttribute("aria-busy", "true");
  });

  it("links a validation error to the field without announcing it", () => {
    render(<InlineTotalEditor {...createEditorProps({ errorMessage: FINANCE_TEXT.TOTAL_INVALID })} />);
    const page = createPurchaseHistoryPage();

    expect(page.getTotalInput(PURCHASE_INPUT)).toHaveAttribute("aria-invalid", "true");
    expect(page.getTotalInput(PURCHASE_INPUT)).toHaveAccessibleDescription(FINANCE_TEXT.TOTAL_INVALID);
    expect(page.queryAlert()).not.toBeInTheDocument();
  });

  it("announces a save error and gives the focus back to the field (SPEC §9)", () => {
    const { rerender } = render(<InlineTotalEditor {...createEditorProps({ status: TOTAL_EDIT_STATUS.SAVING })} />);
    const page = createPurchaseHistoryPage();

    rerender(
      <InlineTotalEditor
        {...createEditorProps({ errorMessage: "No se pudo guardar el total. Intenta de nuevo.", status: TOTAL_EDIT_STATUS.SAVE_FAILED })}
      />,
    );

    expect(page.getAlert()).toHaveTextContent("No se pudo guardar el total. Intenta de nuevo.");
    expect(page.getTotalInput(PURCHASE_INPUT)).toHaveFocus();
  });

  it("shows the browser time zone and confirms it only on «Confirmar» (rule 59)", async () => {
    const onConfirmTimeZone = vi.fn();
    render(
      <InlineTotalEditor
        {...createEditorProps({ onConfirmTimeZone, status: TOTAL_EDIT_STATUS.SAVE_FAILED, timeZoneToConfirm: "America/Costa_Rica" })}
      />,
    );
    const page = createPurchaseHistoryPage();

    expect(page.queryText(`${FINANCE_TEXT.TIME_ZONE_PREFIX}America/Costa_Rica`)).toBeInTheDocument();
    await page.confirmTimeZone();

    expect(onConfirmTimeZone).toHaveBeenCalledTimes(1);
  });

  it("offers no time zone without TZ001 nor TZ002, and disables «Confirmar» while saving", () => {
    const { rerender } = render(<InlineTotalEditor {...createEditorProps()} />);
    const page = createPurchaseHistoryPage();
    expect(page.queryConfirmTimeZoneButton()).not.toBeInTheDocument();

    rerender(<InlineTotalEditor {...createEditorProps({ status: TOTAL_EDIT_STATUS.SAVING, timeZoneToConfirm: "UTC" })} />);

    expect(page.getConfirmTimeZoneButton()).toBeDisabled();
  });
});

describe("PurchaseSessionRow", () => {
  const createRowProps = (overrides: Partial<PurchaseSessionRowProps> = {}): PurchaseSessionRowProps => ({
    amountText: "₡10 000",
    dateText: "Domingo 18 de octubre",
    edit: createEditProps(),
    editor: null,
    id: "purchase-1",
    storeText: "MaxiPali",
    ...overrides,
  });
  const renderRow = (props: PurchaseSessionRowProps) =>
    render(
      <ul>
        <PurchaseSessionRow {...props} />
      </ul>,
    );

  it("shows the amount with its pencil (CA-01)", async () => {
    const onClick = vi.fn();
    renderRow(createRowProps({ edit: createEditProps({ onClick }) }));
    const page = createPurchaseHistoryPage();

    expect(page.queryText("₡10 000")).toBeInTheDocument();
    await page.openEdit(PURCHASE_PENCIL);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(page.queryTotalInput(PURCHASE_INPUT)).not.toBeInTheDocument();
  });

  it("puts the field in place of the amount and the pencil while open", () => {
    renderRow(createRowProps({ editor: createEditorProps() }));
    const page = createPurchaseHistoryPage();

    expect(page.getTotalInput(PURCHASE_INPUT)).toBeInTheDocument();
    expect(page.queryText("₡10 000")).not.toBeInTheDocument();
    expect(page.queryEditButton(PURCHASE_PENCIL)).not.toBeInTheDocument();
    expect(page.queryText("Domingo 18 de octubre")).toBeInTheDocument();
  });

  it("gives the focus back to its pencil when the field closes (SPEC §9)", () => {
    const { rerender } = renderRow(createRowProps({ editor: createEditorProps() }));
    const page = createPurchaseHistoryPage();

    rerender(
      <ul>
        <PurchaseSessionRow {...createRowProps()} />
      </ul>,
    );

    expect(page.getEditButton(PURCHASE_PENCIL)).toHaveFocus();
  });

  it("does not take the focus from the field of another total (D21)", () => {
    const { rerender } = renderRow(createRowProps({ editor: createEditorProps() }));
    const page = createPurchaseHistoryPage();

    rerender(
      <ul>
        <PurchaseSessionRow {...createRowProps()} />
        <PurchaseSessionRow
          {...createRowProps({
            edit: createEditProps({ label: "Editar total del lunes 12 de octubre, Walmart" }),
            editor: createEditorProps({ inputLabel: "Otra compra (₡)" }),
            id: "purchase-2",
          })}
        />
      </ul>,
    );

    expect(page.getTotalInput("Otra compra (₡)")).toHaveFocus();
    expect(page.getEditButton(PURCHASE_PENCIL)).not.toHaveFocus();
  });
});

describe("SpendingTotal with a pencil (SCRUM-91, CA-02)", () => {
  const PERIOD_PENCIL = "Editar total de esta semana";
  const PERIOD_INPUT = "Total de esta semana (₡)";
  const createProps = (overrides: Partial<SpendingTotalProps> = {}): SpendingTotalProps => ({
    closedCount: 2,
    errorMessage: null,
    label: "Gastado esta semana",
    onRetry: vi.fn(),
    rangeText: "Lunes 12 a domingo 18 de octubre",
    status: SPENDING_STATUS.READY,
    totalText: "₡15 000",
    withoutTotalCount: 1,
    ...overrides,
  });

  it("has no pencil without one, as in the Dashboard (D11)", () => {
    render(<SpendingTotal {...createProps()} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("puts the pencil next to the total", async () => {
    const onClick = vi.fn();
    render(<SpendingTotal {...createProps({ edit: createEditProps({ label: PERIOD_PENCIL, onClick }) })} />);
    const page = createPurchaseHistoryPage();

    await page.openEdit(PERIOD_PENCIL);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("keeps the total and the counters visible with the field open, without the pencil", () => {
    render(
      <SpendingTotal
        {...createProps({
          edit: createEditProps({ label: PERIOD_PENCIL }),
          editor: createEditorProps({ inputLabel: PERIOD_INPUT, text: "15000" }),
        })}
      />,
    );
    const page = createPurchaseHistoryPage();

    expect(page.getTotalInput(PERIOD_INPUT)).toHaveValue("15000");
    expect(page.queryText("₡15 000")).toBeInTheDocument();
    expect(page.queryText(FINANCE_TEXT.PURCHASES)).toBeInTheDocument();
    expect(page.queryEditButton(PERIOD_PENCIL)).not.toBeInTheDocument();
  });

  it("gives the focus back to the pencil when the field closes", () => {
    const edit = createEditProps({ label: PERIOD_PENCIL });
    const { rerender } = render(
      <SpendingTotal {...createProps({ edit, editor: createEditorProps({ inputLabel: PERIOD_INPUT }) })} />,
    );
    const page = createPurchaseHistoryPage();

    rerender(<SpendingTotal {...createProps({ edit, editor: null })} />);

    expect(page.getEditButton(PERIOD_PENCIL)).toHaveFocus();
  });
});

describe("PeriodAdjustmentRow (D16)", () => {
  it("shows the date, «Ajuste manual», its level and the signed amount, without a pencil", () => {
    render(
      <ul>
        <PeriodAdjustmentRow amountText="+₡5 000" dateText="Jueves 15 de octubre" id="adjustment-1" scopeText="Total de la semana" />
      </ul>,
    );
    const page = createPurchaseHistoryPage();

    expect(page.queryText("Jueves 15 de octubre")).toBeInTheDocument();
    expect(page.queryText(FINANCE_TEXT.ADJUSTMENT)).toBeInTheDocument();
    expect(page.queryText("Total de la semana")).toBeInTheDocument();
    expect(page.queryText("+₡5 000")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("SpendingTotal: adjustments note (SCRUM-91, SPEC §8)", () => {
  const props: SpendingTotalProps = {
    closedCount: 2,
    errorMessage: null,
    label: "Gastado esta semana",
    onRetry: vi.fn(),
    rangeText: null,
    status: SPENDING_STATUS.READY,
    totalText: "₡20 000",
    withoutTotalCount: 1,
  };

  it("shows «Incluye ajustes manuales» only when it is given, without changing «Compras»", () => {
    const { rerender } = render(<SpendingTotal {...props} />);
    const page = createPurchaseHistoryPage();
    expect(page.queryText(FINANCE_TEXT.INCLUDES_ADJUSTMENTS)).not.toBeInTheDocument();

    rerender(<SpendingTotal {...props} noteText={FINANCE_TEXT.INCLUDES_ADJUSTMENTS} />);

    expect(page.queryText(FINANCE_TEXT.INCLUDES_ADJUSTMENTS)).toBeInTheDocument();
    expect(screen.getByText(FINANCE_TEXT.PURCHASES).nextSibling).toHaveTextContent("2");
  });
});

describe("TimeZoneConfirmation (TZ002, rule 60)", () => {
  it("shows the browser time zone and confirms it only on «Confirmar»", async () => {
    const onConfirm = vi.fn();
    render(<TimeZoneConfirmation errorMessage={null} isSaving={false} onConfirm={onConfirm} timeZone="America/Costa_Rica" />);
    const page = createPurchaseHistoryPage();

    expect(page.queryText(`${FINANCE_TEXT.TIME_ZONE_PREFIX}America/Costa_Rica`)).toBeInTheDocument();
    expect(page.queryAlert()).not.toBeInTheDocument();
    await page.confirmTimeZone();

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables «Confirmar» while saving and announces why the time zone was not saved", () => {
    render(
      <TimeZoneConfirmation
        errorMessage={FINANCE_TEXT.TIME_ZONE_REJECTED}
        isSaving
        onConfirm={vi.fn()}
        timeZone="America/Costa_Rica"
      />,
    );
    const page = createPurchaseHistoryPage();

    expect(page.getConfirmTimeZoneButton()).toBeDisabled();
    expect(page.getAlert()).toHaveTextContent(FINANCE_TEXT.TIME_ZONE_REJECTED);
  });
});