// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ASSIGNEE_LIST_SOURCE } from "@/components/assignee-field/constants/assignee-field.constants";
import { useListAssigneesViewModel } from "@/components/assignee-field/hooks/useListAssigneesViewModel";
import type { ListAssigneeViewModel } from "@/components/assignee-field/models/ListAssigneeViewModel.interface";
import { ShoppingListInner } from "../ShoppingListInner";
import { createShelfLifeChipsPage } from "./ShelfLifeChips.page";
import { useShoppingListViewModel } from "../hooks/useShoppingListViewModel";
import type { ShoppingListRowViewModel } from "../models/ShoppingListRowViewModel.interface";

vi.mock("../hooks/useShoppingListViewModel", () => ({ useShoppingListViewModel: vi.fn() }));
// La fila de sugerencias (SCRUM-102) tiene su propio ViewModel y sus propios tests; acá no se dibuja.
vi.mock("@/features/inventory-suggestions/InventorySuggestions", () => ({ InventorySuggestions: () => null }));
vi.mock("@/components/assignee-field/hooks/useListAssigneesViewModel", () => ({
  useListAssigneesViewModel: vi.fn(),
}));
const useShoppingListViewModelMock = vi.mocked(useShoppingListViewModel);
const useListAssigneesViewModelMock = vi.mocked(useListAssigneesViewModel);

// Sin globals de Vitest, Testing Library no limpia el DOM sola entre tests.
afterEach(cleanup);

const createRow = (id: string, productName: string, isChecked: boolean): ShoppingListRowViewModel => ({
  canDecrease: true,
  canIncrease: true,
  canRemove: true,
  canToggleChecked: true,
  displayedQuantity: 1,
  isChecked,
  item: {
    checkedAt: isChecked ? "2026-11-02T10:00:00Z" : null,
    id,
    productName,
    purchaseSessionId: null,
    quantity: 1,
    quantityBought: null,
    recipeShortfalls: [],
    shortfallSnapshot: null,
    sizeLabel: "1000 ml",
    variantId: `variant-${id}`,
  },
  requestedNote: null,
  shortfallNotes: [],
});

const PENDING_ROW = createRow("item-leche", "Leche entera", false);
const CHECKED_ROW = createRow("item-arroz", "Arroz", true);

const createViewModel = (
  overrides: Partial<ReturnType<typeof useShoppingListViewModel>> = {},
): ReturnType<typeof useShoppingListViewModel> => ({
  activeStoreName: null,
  addErrorMessage: null,
  canAddItems: true,
  canStartPurchase: false,
  checkErrorMessage: null,
  checkedRows: [CHECKED_ROW],
  closePurchase: {
    closeErrorMessage: null,
    isAllChecked: false,
    isClosing: false,
    isVisible: false,
    onDismiss: vi.fn(),
    onSubmit: vi.fn(),
    onTotalChange: vi.fn(),
    totalErrorMessage: null,
    totalText: "",
  },
  detail: null,
  hasCheckedRows: true,
  hasItems: true,
  hasNoSearchResults: false,
  isAllChecked: false,
  isEmpty: false,
  isLoading: false,
  isSearching: false,
  isUndoRemoveVisible: false,
  keptPersonalRows: [{ id: "item-personal", productName: "Pan", quantity: 1, sizeLabel: "500 g" }],
  loadErrorMessage: null,
  onCloseDetail: vi.fn(),
  onDecreaseQuantity: vi.fn(),
  onExitShoppingMode: vi.fn(),
  onIncreaseQuantity: vi.fn(),
  onOpenDetail: vi.fn(),
  onQueryChange: vi.fn(),
  onRemoveItem: vi.fn(),
  onRequestClosePurchase: vi.fn(),
  onSelectSearchOption: vi.fn(),
  onStartPurchase: vi.fn(),
  onToggleChecked: vi.fn(),
  onUndoRemove: vi.fn(),
  pendingRows: [PENDING_ROW],
  quantityErrorMessage: null,
  query: "",
  removeErrorMessage: null,
  searchErrorMessage: null,
  searchOptions: [],
  sessionNoticeMessage: null,
  shelfLifeChips: {
    errorMessage: null,
    isSaving: false,
    itemId: null,
    onChoose: vi.fn(),
    selectedChoice: null,
  },
  shortfallNoticeMessage: null,
  shortfallPanel: {
    errorMessage: null,
    hasNoOtherPresentations: false,
    isBusy: false,
    isLoadingPresentations: false,
    isOpen: false,
    isStillShort: false,
    isViewingPresentations: false,
    notes: [],
    onBack: vi.fn(),
    onClose: vi.fn(),
    onHadEnough: vi.fn(),
    onOtherPresentation: vi.fn(),
    onPickPresentation: vi.fn(),
    onRetryPresentations: vi.fn(),
    onSameAgain: vi.fn(),
    presentations: [],
    presentationsErrorMessage: null,
    productLabel: "",
  },
  storePicker: {
    errorMessage: null,
    isLoading: false,
    isOpen: false,
    isStarting: false,
    onClose: vi.fn(),
    onPickStore: vi.fn(),
    stores: [],
  },
  undoUncheck: {
    errorMessage: null,
    isOpen: false,
    isReverting: false,
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
    returnsToText: "",
  },
  ...overrides,
});

const createAssignees = (overrides: Partial<ListAssigneeViewModel> = {}): ListAssigneeViewModel => ({
  candidates: [],
  errorMessage: null,
  isEnabled: true,
  nameOf: () => "Sin asignar",
  onClose: vi.fn(),
  onOpen: vi.fn(),
  onSelect: vi.fn(),
  openItemId: null,
  savingItemId: null,
  selectedIdOf: () => null,
  ...overrides,
});

const getFieldButtons = (): HTMLElement[] => screen.queryAllByRole("button", { name: /^Encargado: / });

beforeEach(() => {
  vi.resetAllMocks();
  useShoppingListViewModelMock.mockReturnValue(createViewModel());
  useListAssigneesViewModelMock.mockReturnValue(createAssignees());
});

// SCRUM-108, CA-03: el campo "Encargado" en la fila de la lista general.
describe("ShoppingListInner: assignee field (SCRUM-108)", () => {
  it("asks for the assignees of the general list", () => {
    render(<ShoppingListInner />);

    expect(useListAssigneesViewModelMock).toHaveBeenCalledWith({ kind: ASSIGNEE_LIST_SOURCE.GENERAL });
  });

  it("shows the field in every pending and checked row when the setting is on", () => {
    render(<ShoppingListInner />);

    expect(getFieldButtons()).toHaveLength(2);
  });

  it("gives each row its own item to the field", () => {
    const assignees = createAssignees();
    useListAssigneesViewModelMock.mockReturnValue(assignees);
    render(<ShoppingListInner />);

    getFieldButtons().forEach((button) => button.click());

    expect(assignees.onOpen).toHaveBeenCalledWith("item-leche");
    expect(assignees.onOpen).toHaveBeenCalledWith("item-arroz");
  });

  it("shows no field when the setting is off, and the rows look as before", () => {
    useListAssigneesViewModelMock.mockReturnValue(createAssignees({ isEnabled: false }));
    render(<ShoppingListInner />);

    expect(getFieldButtons()).toHaveLength(0);
    expect(screen.getByText("Leche entera")).toBeInTheDocument();
    expect(screen.getByText("Arroz")).toBeInTheDocument();
  });

  it("does not show the field in the kept personal list", () => {
    useShoppingListViewModelMock.mockReturnValue(createViewModel({ checkedRows: [], hasCheckedRows: false }));
    render(<ShoppingListInner />);

    expect(screen.getByText("Pan")).toBeInTheDocument();
    expect(getFieldButtons()).toHaveLength(1);
  });
});

// SCRUM-103 (HU-70b CA-01): los chips de duración, solo debajo de la fila recién tachada.
describe("ShoppingListInner: shelf life chips (SCRUM-103)", () => {
  const getChipGroups = (): HTMLElement[] => screen.queryAllByRole("group", { name: /^¿Cuánto te va a durar / });

  it("shows no chips when no row was just checked", () => {
    render(<ShoppingListInner />);

    expect(getChipGroups()).toHaveLength(0);
  });

  it("shows the chips only under the row that was just checked", () => {
    const viewModel = createViewModel();
    useShoppingListViewModelMock.mockReturnValue(
      createViewModel({ shelfLifeChips: { ...viewModel.shelfLifeChips, itemId: CHECKED_ROW.item.id } }),
    );
    render(<ShoppingListInner />);
    const chipsPage = createShelfLifeChipsPage(CHECKED_ROW.item.productName);

    expect(getChipGroups()).toHaveLength(1);
    expect(chipsPage.getGroup()).toBeInTheDocument();
  });

  it("tapping a chip does not toggle the row", async () => {
    const viewModel = createViewModel();
    const chips = { ...viewModel.shelfLifeChips, itemId: CHECKED_ROW.item.id };
    useShoppingListViewModelMock.mockReturnValue(createViewModel({ shelfLifeChips: chips }));
    render(<ShoppingListInner />);
    const chipsPage = createShelfLifeChipsPage(CHECKED_ROW.item.productName);

    await chipsPage.clickChip("1-3 meses");

    expect(chips.onChoose).toHaveBeenCalledTimes(1);
    expect(useShoppingListViewModelMock.mock.results[0].value.onToggleChecked).not.toHaveBeenCalled();
  });
});
