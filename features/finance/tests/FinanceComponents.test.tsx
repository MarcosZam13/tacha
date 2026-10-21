// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTH_ROUTE } from "@/constants";
import { FinanceNoAccount } from "../components/FinanceNoAccount";
import { SpendingBudget } from "../components/SpendingBudget";
import { SpendingPeriodSelector } from "../components/SpendingPeriodSelector";
import { SpendingTotal } from "../components/SpendingTotal";
import type { SpendingBudgetProps } from "../components/models/SpendingBudgetProps.interface";
import type { SpendingTotalProps } from "../components/models/SpendingTotalProps.interface";
import { BUDGET_STATUS, FINANCE_TEXT, SPENDING_PERIOD, SPENDING_STATUS } from "../constants/finance.constants";
import { createFinanceDashboardPage } from "./FinanceDashboard.page";

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
