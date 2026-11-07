// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DATE_LIST_STATUS, DATE_LIST_STATUS_LABEL, DATE_LIST_TEXT } from "../constants/date-lists.constants";
import { DateListDetailScreen } from "../DateListDetailScreen";
import type { DateListDetail, DateListItem } from "../models/DateList.interface";
import {
  getDateListDetail,
  setDateListCancelled,
  setDateListItemChecked,
} from "../services/date-lists.service";
import { createDateListDetailPage } from "./DateListDetailScreen.page";

vi.mock("../services/date-lists.service", () => ({
  addItemToDateList: vi.fn(),
  getDateListDetail: vi.fn(),
  removeDateListItem: vi.fn(),
  setDateListCancelled: vi.fn(),
  setDateListItemChecked: vi.fn(),
}));
vi.mock("@/hooks/useProductSearch", () => ({
  useProductSearch: () => ({
    clearQuery: vi.fn(),
    errorMessage: null,
    hasNoResults: false,
    isSearching: false,
    query: "",
    results: [],
    setQuery: vi.fn(),
  }),
}));

const getDetailMock = vi.mocked(getDateListDetail);
const setCancelledMock = vi.mocked(setDateListCancelled);
const setCheckedMock = vi.mocked(setDateListItemChecked);

const LIST_ID = "lista-1";

const buildItem = (productName: string, isChecked: boolean): DateListItem => ({
  id: `item-${productName}`,
  isChecked,
  productName,
  quantity: 1,
  sizeLabel: "1 kg",
  variantId: `variante-${productName}`,
});

const buildDetail = (overrides: Partial<DateListDetail> = {}): DateListDetail => ({
  eventDate: "2030-01-15",
  id: LIST_ID,
  items: [buildItem("Arroz", false), buildItem("Leche", true)],
  name: "Paseo",
  status: DATE_LIST_STATUS.ACTIVE,
  ...overrides,
});

// Sin globals de Vitest, Testing Library no limpia el DOM sola entre tests.
afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
  getDetailMock.mockResolvedValue(buildDetail());
  setCancelledMock.mockResolvedValue();
  setCheckedMock.mockResolvedValue();
});

const renderScreen = async (): Promise<ReturnType<typeof createDateListDetailPage>> => {
  render(<DateListDetailScreen listId={LIST_ID} />);
  const page = createDateListDetailPage();
  await page.findTitle("Paseo");
  return page;
};

describe("DateListDetailScreen", () => {
  describe("tachar (HU-46 CA-01)", () => {
    it("shows which items are checked, and only pending ones can change quantity", async () => {
      getDetailMock.mockResolvedValue(buildDetail({ items: [buildItem("Leche", true)] }));
      const page = await renderScreen();

      expect(page.getCheckbox("Leche")).toHaveAttribute("aria-checked", "true");
      expect(page.queryDecrease()).not.toBeInTheDocument();
    });

    it("checks an item and shows the status the database decided", async () => {
      const page = await renderScreen();
      getDetailMock.mockResolvedValue(
        buildDetail({
          items: [buildItem("Arroz", true), buildItem("Leche", true)],
          status: DATE_LIST_STATUS.COMPLETED,
        }),
      );

      await page.clickToggle("Arroz");

      expect(setCheckedMock).toHaveBeenCalledWith("item-Arroz", true);
      expect(await page.findStatus(DATE_LIST_STATUS_LABEL[DATE_LIST_STATUS.COMPLETED])).toBeInTheDocument();
    });

    it("unchecks an item that was checked", async () => {
      const page = await renderScreen();

      await page.clickToggle("Leche");

      expect(setCheckedMock).toHaveBeenCalledWith("item-Leche", false);
    });

    it("explains the failure when checking does not work", async () => {
      setCheckedMock.mockRejectedValue(new Error("sin red"));
      const page = await renderScreen();

      await page.clickToggle("Arroz");

      expect(await page.findAlert()).toHaveTextContent(DATE_LIST_TEXT.CHECK_ERROR);
    });
  });

  describe("cancelar (HU-46 CA-02)", () => {
    it("asks for confirmation before cancelling", async () => {
      const page = await renderScreen();

      await page.clickCancelList();

      expect(page.queryCancelDialog()).toBeInTheDocument();
      expect(setCancelledMock).not.toHaveBeenCalled();
    });

    it("keeps the list when the confirmation is dismissed", async () => {
      const page = await renderScreen();

      await page.clickCancelList();
      await page.clickKeepList();

      expect(page.queryCancelDialog()).not.toBeInTheDocument();
      expect(setCancelledMock).not.toHaveBeenCalled();
    });

    it("cancels after confirming and keeps showing the items", async () => {
      const page = await renderScreen();
      getDetailMock.mockResolvedValue(buildDetail({ status: DATE_LIST_STATUS.CANCELLED }));

      await page.clickCancelList();
      await page.clickConfirmCancel();

      expect(setCancelledMock).toHaveBeenCalledWith(LIST_ID, true);
      expect(await page.findStatus(DATE_LIST_STATUS_LABEL[DATE_LIST_STATUS.CANCELLED])).toBeInTheDocument();
      expect(page.getCheckboxes()).toHaveLength(2);
    });
  });

  describe("una sublista cancelada", () => {
    beforeEach(() => {
      getDetailMock.mockResolvedValue(buildDetail({ status: DATE_LIST_STATUS.CANCELLED }));
    });

    it("disables its actions and only offers to reactivate", async () => {
      const page = await renderScreen();

      expect(page.getCheckbox("Arroz")).toBeDisabled();
      expect(page.queryCancelList()).not.toBeInTheDocument();
      expect(page.queryReactivate()).toBeInTheDocument();
    });

    it("reactivates and shows the status the database recalculated", async () => {
      const page = await renderScreen();
      getDetailMock.mockResolvedValue(buildDetail({ status: DATE_LIST_STATUS.ACTIVE }));

      await page.clickReactivate();

      expect(setCancelledMock).toHaveBeenCalledWith(LIST_ID, false);
      expect(await page.findStatus(DATE_LIST_STATUS_LABEL[DATE_LIST_STATUS.ACTIVE])).toBeInTheDocument();
      expect(page.queryReactivate()).not.toBeInTheDocument();
    });
  });

  it("a completed list can still be cancelled", async () => {
    getDetailMock.mockResolvedValue(buildDetail({ status: DATE_LIST_STATUS.COMPLETED }));
    const page = await renderScreen();

    expect(page.queryCancelList()).toBeInTheDocument();
  });
});
