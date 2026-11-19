// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FINANCE_ACCESS_STATUS,
  FINANCE_TEXT,
  PENDING_REMINDER_STATUS,
  SPENDING_PERIOD,
  SPENDING_STATUS,
  TOTAL_EDIT_STATUS,
  TOTAL_SAVE_ERROR,
  TOTAL_SAVE_ERROR_MESSAGE,
} from "../constants/finance.constants";
import { usePurchaseHistoryViewModel } from "../hooks/usePurchaseHistoryViewModel";
import type { ZonedPeriodFinance } from "../models/PeriodFinance.type";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import { TotalSaveError } from "../models/TotalMutations.interface";
import {
  getPeriodFinance,
  getPeriodPurchases,
  getPurchasesWithoutTotal,
  hasRegisteredSession,
  setPeriodTotal,
  setPurchaseTotal,
  setSpendingTimeZone,
} from "../services/finance.service";

vi.mock("../services/finance.service", () => ({
  getPeriodFinance: vi.fn(),
  getPeriodPurchases: vi.fn(),
  getPurchasesWithoutTotal: vi.fn(),
  hasRegisteredSession: vi.fn(),
  setPeriodTotal: vi.fn(),
  setPurchaseTotal: vi.fn(),
  setSpendingTimeZone: vi.fn(),
}));
const sessionMock = vi.mocked(hasRegisteredSession);
const purchasesMock = vi.mocked(getPeriodPurchases);
const financeMock = vi.mocked(getPeriodFinance);
const pendingMock = vi.mocked(getPurchasesWithoutTotal);
const purchaseSaveMock = vi.mocked(setPurchaseTotal);
const periodSaveMock = vi.mocked(setPeriodTotal);
const timeZoneSaveMock = vi.mocked(setSpendingTimeZone);

// Domingo 18 de octubre de 2026, 15:00 en hora local.
const NOW = new Date(2026, 9, 18, 15, 0);

const buildPurchase = (overrides: Partial<PeriodPurchase> = {}): PeriodPurchase => ({
  closedAt: NOW.toISOString(),
  id: "purchase-1",
  storeName: "MaxiPali",
  totalAmount: 10000,
  ...overrides,
});

// Intl separa los miles con un espacio especial: se normaliza para comparar.
const toPlainSpaces = (text: string | null): string | null => text?.replace(/\s/gu, " ") ?? null;

const renderLoaded = async () => {
  const rendered = renderHook(() => usePurchaseHistoryViewModel());
  await waitFor(() => expect(rendered.result.current.spending.status).toBe(SPENDING_STATUS.READY));
  return rendered;
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  // Sin zona guardada: se lee como antes, con el navegador (SPEC regla 59).
  financeMock.mockResolvedValue({ timeZone: null });
  // Sin compras sin total: el recordatorio y la sección no se ven (SCRUM-92).
  pendingMock.mockResolvedValue([]);
  sessionMock.mockResolvedValue(true);
  purchasesMock.mockResolvedValue([buildPurchase()]);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("usePurchaseHistoryViewModel: access (D6)", () => {
  it("checks the session before asking for purchases", async () => {
    const { result } = renderHook(() => usePurchaseHistoryViewModel());

    expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.CHECKING);
    expect(purchasesMock).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.READY));
  });

  it("asks for no purchases without a registered account", async () => {
    sessionMock.mockResolvedValue(false);
    const { result } = renderHook(() => usePurchaseHistoryViewModel());

    await waitFor(() => expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.NO_ACCOUNT));
    expect(purchasesMock).not.toHaveBeenCalled();
    expect(result.current.purchaseRows).toEqual([]);
  });
});

describe("usePurchaseHistoryViewModel: rows", () => {
  it("gives each row its date, store and amount", async () => {
    const { result } = await renderLoaded();

    const [row] = result.current.purchaseRows;
    expect(row.id).toBe("purchase-1");
    expect(row.dateText).toBe("Domingo 18 de octubre");
    expect(row.storeText).toBe("MaxiPali");
    expect(toPlainSpaces(row.amountText)).toBe("₡10 000");
  });

  it("shows «Sin total» for a null total and ₡0 for a real zero (D8)", async () => {
    purchasesMock.mockResolvedValue([
      buildPurchase({ id: "without-total", totalAmount: null }),
      buildPurchase({ id: "zero", totalAmount: 0 }),
    ]);
    const { result } = await renderLoaded();

    expect(result.current.purchaseRows.map((row) => row.amountText)).toEqual([FINANCE_TEXT.WITHOUT_TOTAL, "₡0"]);
    // El badge solo en la que no tiene total (SCRUM-92, CA-01); ₡0 es un total real.
    expect(result.current.purchaseRows.map((row) => row.hasNoTotal)).toEqual([true, false]);
    expect(result.current.spending.closedCount).toBe(1);
    expect(result.current.spending.withoutTotalCount).toBe(1);
    expect(result.current.spending.totalText).toBe("₡0");
  });

  it("keeps a row without a store name and its amount in the total (rule 29)", async () => {
    purchasesMock.mockResolvedValue([buildPurchase({ storeName: null })]);
    const { result } = await renderLoaded();

    expect(result.current.purchaseRows[0].storeText).toBe(FINANCE_TEXT.STORE_UNAVAILABLE);
    expect(toPlainSpaces(result.current.spending.totalText)).toBe("₡10 000");
  });
});

describe("usePurchaseHistoryViewModel: period (CA-02, D9)", () => {
  it("offers Día, Semana and Mes, with Semana chosen", async () => {
    const { result } = await renderLoaded();

    expect(result.current.periodOptions.map((option) => option.label)).toEqual(["Día", "Semana", "Mes"]);
    expect(result.current.periodOptions.find((option) => option.isSelected)?.period).toBe(SPENDING_PERIOD.WEEK);
  });

  it("shows the week total with its dates and announces it", async () => {
    purchasesMock.mockResolvedValue([buildPurchase(), buildPurchase({ id: "purchase-2", totalAmount: 5000 })]);
    const { result } = await renderLoaded();

    expect(result.current.spending.label).toBe("Gastado esta semana");
    expect(result.current.spending.rangeText).toBe("Lunes 12 a domingo 18 de octubre");
    expect(toPlainSpaces(result.current.spending.totalText)).toBe("₡15 000");
    expect(toPlainSpaces(result.current.statusMessage)).toBe("Gastado esta semana: ₡15 000");
  });

  it("clears the rows and asks for the new period", async () => {
    const { result } = await renderLoaded();

    act(() => result.current.periodOptions[0].onSelect());

    expect(result.current.spending.status).toBe(SPENDING_STATUS.LOADING);
    expect(result.current.spending.label).toBe("Gastado hoy");
    expect(result.current.purchaseRows).toEqual([]);
    expect(result.current.statusMessage).toBeNull();
    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.READY));
    expect(purchasesMock).toHaveBeenLastCalledWith({ end: new Date(2026, 9, 19), start: new Date(2026, 9, 18) });
  });

  it("starts again on Semana when the screen opens again", async () => {
    const { result, unmount } = await renderLoaded();
    act(() => result.current.periodOptions[2].onSelect());
    unmount();

    const { result: reopened } = await renderLoaded();

    expect(reopened.current.periodOptions.find((option) => option.isSelected)?.period).toBe(SPENDING_PERIOD.WEEK);
  });
});

describe("usePurchaseHistoryViewModel: empty and errors", () => {
  it("is empty at ₡0 without rows", async () => {
    purchasesMock.mockResolvedValue([]);
    const { result } = renderHook(() => usePurchaseHistoryViewModel());

    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.EMPTY));
    expect(result.current.spending.totalText).toBe("₡0");
    expect(result.current.purchaseRows).toEqual([]);
  });

  it("shows the load error without rows or total, and retries the same period", async () => {
    purchasesMock.mockRejectedValueOnce(new Error("incomplete"));
    const { result } = renderHook(() => usePurchaseHistoryViewModel());
    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.FAILED));

    expect(result.current.spending.errorMessage).toBe(FINANCE_TEXT.SPENDING_LOAD_ERROR);
    expect(result.current.spending.totalText).toBeNull();
    expect(result.current.purchaseRows).toEqual([]);

    await act(async () => result.current.spending.onRetry());

    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.READY));
    expect(purchasesMock).toHaveBeenCalledTimes(2);
  });
});

describe("usePurchaseHistoryViewModel: saved time zone (SCRUM-91)", () => {
  it("gives rows and dates in the saved time zone, not the browser one (rule 58)", async () => {
    // Domingo 18 a las 10:00 en Costa Rica; ya es lunes 19 en Tokio.
    const purchase = buildPurchase({ closedAt: "2026-10-18T16:00:00Z" });
    financeMock.mockResolvedValue({
      adjustments: [],
      bounds: { end: new Date("2026-10-25T15:00:00Z"), start: new Date("2026-10-18T15:00:00Z") },
      purchases: [purchase],
      spending: { adjustmentCount: 0, closedCount: 1, total: 10000, withoutTotalCount: 0 },
      timeZone: "Asia/Tokyo",
    });
    const { result } = await renderLoaded();

    expect(purchasesMock).not.toHaveBeenCalled();
    expect(result.current.purchaseRows[0]?.dateText).toBe("Lunes 19 de octubre");
    expect(result.current.spending.rangeText).toBe("Lunes 19 a domingo 25 de octubre");
  });
});

describe("usePurchaseHistoryViewModel: editing totals (SCRUM-91)", () => {
  const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const ZONED_WEEK = { end: new Date(2026, 9, 19), start: new Date(2026, 9, 12) };
  // La zona guardada es la del navegador: las fechas de las filas no cambian.
  const zonedFinance = (purchases: PeriodPurchase[], total: number): ZonedPeriodFinance => ({
    adjustments: [],
    bounds: ZONED_WEEK,
    purchases,
    spending: {
      adjustmentCount: 0,
      closedCount: purchases.filter((purchase) => purchase.totalAmount !== null).length,
      total,
      withoutTotalCount: purchases.filter((purchase) => purchase.totalAmount === null).length,
    },
    timeZone: BROWSER_TIME_ZONE,
  });

  it("gives each purchase a pencil with its own name, also «Sin total» ones (D12, SPEC §9)", async () => {
    purchasesMock.mockResolvedValue([
      buildPurchase(),
      buildPurchase({ id: "purchase-2", storeName: null, totalAmount: null }),
    ]);
    const { result } = await renderLoaded();

    expect(result.current.purchaseRows.map((row) => row.edit.label)).toEqual([
      "Editar total del domingo 18 de octubre, MaxiPali",
      "Editar total del domingo 18 de octubre, Supermercado no disponible",
    ]);
    expect(result.current.purchaseRows.every((row) => !row.edit.isDisabled && row.editor === null)).toBe(true);
  });

  it.each<[string, PeriodPurchase["totalAmount"], string]>([
    ["the rounded amount that is seen (D22)", 1234.56, "1235"],
    ["empty for «Sin total» (D13)", null, ""],
    ["₡0 as a real total", 0, "0"],
  ])("opens a purchase field with %s", async (_, totalAmount, text) => {
    purchasesMock.mockResolvedValue([buildPurchase({ totalAmount })]);
    const { result } = await renderLoaded();

    act(() => result.current.purchaseRows[0]?.edit.onClick());

    expect(result.current.purchaseRows[0]?.editor).toMatchObject({
      inputLabel: FINANCE_TEXT.PURCHASE_TOTAL_INPUT_LABEL,
      status: TOTAL_EDIT_STATUS.EDITING,
      text,
    });
  });

  it("shows the field only in the opened row", async () => {
    purchasesMock.mockResolvedValue([buildPurchase(), buildPurchase({ id: "purchase-2" })]);
    const { result } = await renderLoaded();

    act(() => result.current.purchaseRows[1]?.edit.onClick());

    expect(result.current.purchaseRows.map((row) => row.editor !== null)).toEqual([false, true]);
    expect(result.current.periodEditor).toBeNull();
  });

  it("gives the period a pencil that opens with its rounded total", async () => {
    purchasesMock.mockResolvedValue([buildPurchase({ totalAmount: 1234.56 })]);
    const { result } = await renderLoaded();

    expect(result.current.periodEdit?.label).toBe("Editar total de esta semana");
    act(() => result.current.periodEdit?.onClick());

    expect(result.current.periodEditor).toMatchObject({ inputLabel: "Total de esta semana (₡)", text: "1235" });
  });

  it("offers the period pencil in an empty period (D17), not while loading nor with an error", async () => {
    purchasesMock.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => usePurchaseHistoryViewModel());
    expect(result.current.periodEdit).toBeNull();

    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.EMPTY));
    expect(result.current.periodEdit).not.toBeNull();

    await act(async () => result.current.spending.onRetry());
    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.FAILED));
    expect(result.current.periodEdit).toBeNull();
  });

  it("saves a purchase, updates the total without loading and announces it", async () => {
    const purchase = buildPurchase({ totalAmount: null });
    financeMock.mockResolvedValue(zonedFinance([purchase], 0));
    purchaseSaveMock.mockResolvedValue({ closedAt: purchase.closedAt, id: purchase.id, totalAmount: 12000 });
    const { result } = await renderLoaded();

    act(() => result.current.purchaseRows[0]?.edit.onClick());
    act(() => result.current.purchaseRows[0]?.editor?.onTextChange("12 000"));
    await act(async () => result.current.purchaseRows[0]?.editor?.onSave());

    await waitFor(() => expect(result.current.purchaseRows[0]?.editor).toBeNull());
    expect(purchaseSaveMock).toHaveBeenCalledWith({ purchaseId: "purchase-1", total: 12000 });
    expect(toPlainSpaces(result.current.purchaseRows[0]?.amountText ?? null)).toBe("₡12 000");
    expect(toPlainSpaces(result.current.spending.totalText)).toBe("₡12 000");
    expect(result.current.spending.closedCount).toBe(1);
    expect(toPlainSpaces(result.current.statusMessage)).toBe("Total guardado. Gastado esta semana: ₡12 000");
    expect(financeMock).toHaveBeenCalledTimes(1);
  });

  it("saves the period total and shows the total of the database", async () => {
    financeMock.mockResolvedValue(zonedFinance([buildPurchase()], 10000));
    periodSaveMock.mockResolvedValue({
      adjustment: { amount: 5000, effectiveAt: NOW.toISOString(), id: "adjustment-1", scope: SPENDING_PERIOD.WEEK },
    });
    const { result } = await renderLoaded();

    act(() => result.current.periodEdit?.onClick());
    act(() => result.current.periodEditor?.onTextChange("15000"));
    await act(async () => result.current.periodEditor?.onSave());

    await waitFor(() => expect(result.current.periodEditor).toBeNull());
    expect(periodSaveMock).toHaveBeenCalledWith({ period: SPENDING_PERIOD.WEEK, total: 15000 });
    expect(toPlainSpaces(result.current.spending.totalText)).toBe("₡15 000");
    // Un ajuste no es una compra (D16).
    expect(result.current.spending.closedCount).toBe(1);
  });

  it("disables every pencil while a total is saving (D21)", async () => {
    financeMock.mockResolvedValue(zonedFinance([buildPurchase(), buildPurchase({ id: "purchase-2" })], 20000));
    purchaseSaveMock.mockReturnValue(new Promise(() => undefined));
    const { result } = await renderLoaded();

    act(() => result.current.purchaseRows[0]?.edit.onClick());
    await act(async () => result.current.purchaseRows[0]?.editor?.onSave());

    await waitFor(() => expect(result.current.purchaseRows[0]?.editor?.status).toBe(TOTAL_EDIT_STATUS.SAVING));
    expect(result.current.purchaseRows.every((row) => row.edit.isDisabled)).toBe(true);
    expect(result.current.periodEdit?.isDisabled).toBe(true);
  });

  it("goes to no account instead of saving when the session is no longer registered (SPEC §7)", async () => {
    const { result } = await renderLoaded();
    act(() => result.current.purchaseRows[0]?.edit.onClick());
    sessionMock.mockResolvedValue(false);

    await act(async () => result.current.purchaseRows[0]?.editor?.onSave());

    await waitFor(() => expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.NO_ACCOUNT));
    expect(purchaseSaveMock).not.toHaveBeenCalled();
  });

  it("asks to confirm the browser time zone with TZ001 and reads again once saved (rule 59)", async () => {
    purchaseSaveMock
      .mockRejectedValueOnce(new TotalSaveError(TOTAL_SAVE_ERROR.TIME_ZONE_MISSING, { code: "TZ001" }))
      .mockResolvedValueOnce({ closedAt: NOW.toISOString(), id: "purchase-1", totalAmount: 12000 });
    timeZoneSaveMock.mockResolvedValue({ timeZone: BROWSER_TIME_ZONE });
    const { result } = await renderLoaded();

    act(() => result.current.purchaseRows[0]?.edit.onClick());
    act(() => result.current.purchaseRows[0]?.editor?.onTextChange("12000"));
    await act(async () => result.current.purchaseRows[0]?.editor?.onSave());
    await waitFor(() => expect(result.current.purchaseRows[0]?.editor?.timeZoneToConfirm).toBe(BROWSER_TIME_ZONE));
    expect(result.current.purchaseRows[0]?.editor?.errorMessage).toBe(
      TOTAL_SAVE_ERROR_MESSAGE[TOTAL_SAVE_ERROR.TIME_ZONE_MISSING],
    );
    expect(timeZoneSaveMock).not.toHaveBeenCalled();

    financeMock.mockClear();
    act(() => result.current.purchaseRows[0]?.editor?.onConfirmTimeZone());

    // Se leyó sin zona: con la zona recién confirmada, el periodo se vuelve a leer.
    await waitFor(() => expect(financeMock).toHaveBeenCalledTimes(1));
    expect(timeZoneSaveMock).toHaveBeenCalledWith({ timeZone: BROWSER_TIME_ZONE });
    expect(purchaseSaveMock).toHaveBeenCalledTimes(2);
  });

  it("shows no totals and offers to confirm a time zone with TZ002 when reading (rule 60)", async () => {
    financeMock.mockResolvedValueOnce(null);
    timeZoneSaveMock.mockResolvedValue({ timeZone: BROWSER_TIME_ZONE });
    const { result } = renderHook(() => usePurchaseHistoryViewModel());

    await waitFor(() => expect(result.current.timeZoneConfirmation).not.toBeNull());
    expect(result.current.spending.status).toBe(SPENDING_STATUS.FAILED);
    expect(result.current.spending.errorMessage).toBe(TOTAL_SAVE_ERROR_MESSAGE[TOTAL_SAVE_ERROR.TIME_ZONE_UNRECOGNIZED]);
    expect(result.current.spending.totalText).toBeNull();
    expect(result.current.periodEdit).toBeNull();
    expect(result.current.timeZoneConfirmation?.timeZone).toBe(BROWSER_TIME_ZONE);

    await act(async () => result.current.timeZoneConfirmation?.onConfirm());

    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.READY));
    expect(timeZoneSaveMock).toHaveBeenCalledWith({ timeZone: BROWSER_TIME_ZONE });
    expect(result.current.timeZoneConfirmation).toBeNull();
  });
});

describe("usePurchaseHistoryViewModel: adjustment rows (SCRUM-91, D16)", () => {
  const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

  it("puts purchases and adjustments in one list, newest first, with the signed amount and the level", async () => {
    // Domingo 10:00 (compra), jueves 12:00 (ajuste de la semana), martes 09:00 (ajuste del día).
    const sunday = buildPurchase({ closedAt: new Date(2026, 9, 18, 10, 0).toISOString() });
    financeMock.mockResolvedValue({
      adjustments: [
        { amount: 500, effectiveAt: new Date(2026, 9, 13, 9, 0).toISOString(), id: "day-adjustment", scope: SPENDING_PERIOD.DAY },
        { amount: -2000, effectiveAt: new Date(2026, 9, 15, 12, 0).toISOString(), id: "week-adjustment", scope: SPENDING_PERIOD.WEEK },
      ],
      bounds: { end: new Date(2026, 9, 19), start: new Date(2026, 9, 12) },
      purchases: [sunday],
      spending: { adjustmentCount: 2, closedCount: 1, total: 8500, withoutTotalCount: 0 },
      timeZone: BROWSER_TIME_ZONE,
    });
    const { result } = await renderLoaded();

    expect(result.current.listRows.map((listRow) => listRow.row.id)).toEqual(["purchase-1", "week-adjustment", "day-adjustment"]);
    const [, weekRow, dayRow] = result.current.listRows;
    expect(weekRow?.kind).toBe("adjustment");
    expect(weekRow?.row).toMatchObject({ dateText: "Jueves 15 de octubre", scopeText: "Total de la semana" });
    expect(toPlainSpaces(weekRow?.kind === "adjustment" ? weekRow.row.amountText : null)).toBe("−₡2 000");
    expect(dayRow?.row).toMatchObject({ scopeText: "Total del día" });
    // Los ajustes no son compras: ni lápiz ni "Compras" (D16).
    expect(result.current.purchaseRows).toHaveLength(1);
    expect(result.current.spending.closedCount).toBe(1);
  });

  it("lists only purchases without a saved time zone, as before (rule 59)", async () => {
    const { result } = await renderLoaded();

    expect(result.current.listRows.every((listRow) => listRow.kind === "purchase")).toBe(true);
    expect(result.current.listRows).toHaveLength(result.current.purchaseRows.length);
  });
});

describe("usePurchaseHistoryViewModel: purchases without a total (SCRUM-92)", () => {
  const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Miércoles 14 a las 10:00 (4 días: cuenta) y domingo 18 a las 13:00 (2 horas: no cuenta).
  const OLD_PENDING = buildPurchase({ closedAt: new Date(2026, 9, 14, 10, 0).toISOString(), id: "old", storeName: "Walmart", totalAmount: null });
  const RECENT_PENDING = buildPurchase({ closedAt: new Date(2026, 9, 18, 13, 0).toISOString(), id: "recent", totalAmount: null });
  // Del mes pasado: no está en el periodo (D25).
  const LAST_MONTH = buildPurchase({ closedAt: new Date(2026, 8, 20, 10, 0).toISOString(), id: "last-month", storeName: "Walmart", totalAmount: null });

  const zonedWeek = (periodRows: PeriodPurchase[]): ZonedPeriodFinance => ({
    adjustments: [],
    bounds: { end: new Date(2026, 9, 19), start: new Date(2026, 9, 12) },
    purchases: periodRows,
    spending: {
      adjustmentCount: 0,
      closedCount: periodRows.filter((row) => row.totalAmount !== null).length,
      total: periodRows.reduce((sum, row) => sum + (row.totalAmount ?? 0), 0),
      withoutTotalCount: periodRows.filter((row) => row.totalAmount === null).length,
    },
    timeZone: BROWSER_TIME_ZONE,
  });

  it("lists every pending purchase of any date, with its badge and pencil (D25, rule 70)", async () => {
    pendingMock.mockResolvedValue([RECENT_PENDING, OLD_PENDING, LAST_MONTH]);
    const { result } = await renderLoaded();

    await waitFor(() => expect(result.current.pendingRows).toHaveLength(3));
    expect(result.current.pendingRows.map((row) => row.id)).toEqual(["recent", "old", "last-month"]);
    expect(result.current.pendingRows.every((row) => row.hasNoTotal && row.editor === null)).toBe(true);
    expect(result.current.pendingRows[2]?.edit.label).toBe("Editar total del domingo 20 de septiembre, Walmart");
  });

  it("reminds only about the ones of 24 hours or more, with a link to the section (D23, D26)", async () => {
    pendingMock.mockResolvedValue([RECENT_PENDING, OLD_PENDING, LAST_MONTH]);
    const { result } = await renderLoaded();

    await waitFor(() => expect(result.current.pendingReminder.status).toBe(PENDING_REMINDER_STATUS.PENDING));
    expect(result.current.pendingReminder).toMatchObject({
      linkHref: "#compras-sin-total",
      linkText: "Completarlas",
      messageText: "Tienes 2 compras sin total desde hace más de 24 horas",
    });
  });

  it("shows neither the reminder nor the section without pending purchases", async () => {
    const { result } = await renderLoaded();

    await waitFor(() => expect(result.current.pendingReminder.status).toBe(PENDING_REMINDER_STATUS.NONE));
    expect(result.current.pendingRows).toEqual([]);
  });

  it("completes a purchase of a previous period from the section, without loading again (CA-03, rule 69)", async () => {
    pendingMock.mockResolvedValue([OLD_PENDING, LAST_MONTH]);
    purchaseSaveMock.mockResolvedValue({ closedAt: LAST_MONTH.closedAt, id: "last-month", totalAmount: 8000 });
    const { result } = await renderLoaded();
    await waitFor(() => expect(result.current.pendingRows).toHaveLength(2));
    const weekTotal = result.current.spending.totalText;

    act(() => result.current.pendingRows[1]?.edit.onClick());
    act(() => result.current.pendingRows[1]?.editor?.onTextChange("8000"));
    await act(async () => result.current.pendingRows[1]?.editor?.onSave());

    await waitFor(() => expect(result.current.pendingRows.map((row) => row.id)).toEqual(["old"]));
    expect(purchaseSaveMock).toHaveBeenCalledWith({ purchaseId: "last-month", total: 8000 });
    expect(result.current.pendingReminder.messageText).toBe("Tienes 1 compra sin total desde hace más de 24 horas");
    expect(result.current.spending.totalText).toBe(weekTotal);
    expect(pendingMock).toHaveBeenCalledTimes(1);
  });

  it("opens the field only in the list where the pencil was tapped, also for a purchase in both (D21, rule 68)", async () => {
    financeMock.mockResolvedValue(zonedWeek([buildPurchase(), OLD_PENDING]));
    pendingMock.mockResolvedValue([OLD_PENDING]);
    const { result } = await renderLoaded();
    await waitFor(() => expect(result.current.pendingRows).toHaveLength(1));

    act(() => result.current.pendingRows[0]?.edit.onClick());

    expect(result.current.pendingRows[0]?.editor).not.toBeNull();
    expect(result.current.purchaseRows.find((row) => row.id === "old")?.editor).toBeNull();
  });

  it("applies a completed purchase in both lists: the period total and counters, and the section (rule 69)", async () => {
    financeMock.mockResolvedValue(zonedWeek([buildPurchase(), OLD_PENDING]));
    pendingMock.mockResolvedValue([OLD_PENDING]);
    purchaseSaveMock.mockResolvedValue({ closedAt: OLD_PENDING.closedAt, id: "old", totalAmount: 0 });
    const { result } = await renderLoaded();
    await waitFor(() => expect(result.current.pendingRows).toHaveLength(1));

    act(() => result.current.pendingRows[0]?.edit.onClick());
    act(() => result.current.pendingRows[0]?.editor?.onTextChange("0"));
    await act(async () => result.current.pendingRows[0]?.editor?.onSave());

    await waitFor(() => expect(result.current.pendingRows).toEqual([]));
    expect(result.current.purchaseRows.find((row) => row.id === "old")).toMatchObject({ amountText: "₡0", hasNoTotal: false });
    expect(result.current.spending.closedCount).toBe(2);
    expect(result.current.spending.withoutTotalCount).toBe(0);
    expect(result.current.pendingReminder.status).toBe(PENDING_REMINDER_STATUS.NONE);
  });

  it("keeps the P0002 message next to the field and reads the pending purchases again on cancel", async () => {
    pendingMock.mockResolvedValueOnce([LAST_MONTH]).mockResolvedValueOnce([]);
    purchaseSaveMock.mockRejectedValue(new TotalSaveError(TOTAL_SAVE_ERROR.PURCHASE_UNAVAILABLE, { code: "P0002" }));
    const { result } = await renderLoaded();
    await waitFor(() => expect(result.current.pendingRows).toHaveLength(1));

    act(() => result.current.pendingRows[0]?.edit.onClick());
    act(() => result.current.pendingRows[0]?.editor?.onTextChange("8000"));
    await act(async () => result.current.pendingRows[0]?.editor?.onSave());

    await waitFor(() =>
      expect(result.current.pendingRows[0]?.editor?.errorMessage).toBe(
        TOTAL_SAVE_ERROR_MESSAGE[TOTAL_SAVE_ERROR.PURCHASE_UNAVAILABLE],
      ),
    );
    expect(pendingMock).toHaveBeenCalledTimes(1);

    act(() => result.current.pendingRows[0]?.editor?.onCancel());

    await waitFor(() => expect(pendingMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.pendingRows).toEqual([]));
  });

  it("validates a total written in the section without calling the database (D13, D14)", async () => {
    pendingMock.mockResolvedValue([LAST_MONTH]);
    const { result } = await renderLoaded();
    await waitFor(() => expect(result.current.pendingRows).toHaveLength(1));

    act(() => result.current.pendingRows[0]?.edit.onClick());
    act(() => result.current.pendingRows[0]?.editor?.onTextChange("12.5"));
    await act(async () => result.current.pendingRows[0]?.editor?.onSave());

    await waitFor(() => expect(result.current.pendingRows[0]?.editor?.errorMessage).toBe(FINANCE_TEXT.TOTAL_INVALID));
    expect(purchaseSaveMock).not.toHaveBeenCalled();
  });

  it("asks to confirm the time zone from the section too, and completes the purchase after it (rule 59)", async () => {
    pendingMock.mockResolvedValue([LAST_MONTH]);
    purchaseSaveMock
      .mockRejectedValueOnce(new TotalSaveError(TOTAL_SAVE_ERROR.TIME_ZONE_MISSING, { code: "TZ001" }))
      .mockResolvedValueOnce({ closedAt: LAST_MONTH.closedAt, id: "last-month", totalAmount: 8000 });
    timeZoneSaveMock.mockResolvedValue({ timeZone: BROWSER_TIME_ZONE });
    const { result } = await renderLoaded();
    await waitFor(() => expect(result.current.pendingRows).toHaveLength(1));

    act(() => result.current.pendingRows[0]?.edit.onClick());
    act(() => result.current.pendingRows[0]?.editor?.onTextChange("8000"));
    await act(async () => result.current.pendingRows[0]?.editor?.onSave());
    await waitFor(() => expect(result.current.pendingRows[0]?.editor?.timeZoneToConfirm).toBe(BROWSER_TIME_ZONE));

    act(() => result.current.pendingRows[0]?.editor?.onConfirmTimeZone());

    await waitFor(() => expect(result.current.pendingRows).toEqual([]));
    expect(timeZoneSaveMock).toHaveBeenCalledWith({ timeZone: BROWSER_TIME_ZONE });
    expect(purchaseSaveMock).toHaveBeenCalledTimes(2);
  });
  it("does not read the pending purchases again on a normal cancel", async () => {
    pendingMock.mockResolvedValue([LAST_MONTH]);
    const { result } = await renderLoaded();
    await waitFor(() => expect(result.current.pendingRows).toHaveLength(1));

    act(() => result.current.pendingRows[0]?.edit.onClick());
    act(() => result.current.pendingRows[0]?.editor?.onCancel());

    expect(pendingMock).toHaveBeenCalledTimes(1);
  });

  it("shows the read error in the reminder, keeps the period total and retries (rule 67)", async () => {
    pendingMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce([OLD_PENDING]);
    const { result } = await renderLoaded();

    await waitFor(() => expect(result.current.pendingReminder.status).toBe(PENDING_REMINDER_STATUS.FAILED));
    expect(result.current.pendingReminder.errorMessage).toBe(FINANCE_TEXT.PENDING_REMINDER_LOAD_ERROR);
    expect(result.current.spending.status).toBe(SPENDING_STATUS.READY);
    expect(result.current.pendingRows).toEqual([]);

    await act(async () => result.current.pendingReminder.onRetry());

    await waitFor(() => expect(result.current.pendingReminder.status).toBe(PENDING_REMINDER_STATUS.PENDING));
    expect(pendingMock).toHaveBeenCalledTimes(2);
  });
});