// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssigneeField } from "../AssigneeField";
import { ASSIGNEE_TEXT } from "../constants/assignee-field.constants";
import type { ListAssigneeViewModel } from "../models/ListAssigneeViewModel.interface";
import { createAssigneeFieldPage } from "./AssigneeField.page";

const ITEM_ID = "item-1";
const OTHER_ITEM_ID = "item-2";

const baseViewModel = (overrides: Partial<ListAssigneeViewModel> = {}): ListAssigneeViewModel => ({
  candidates: [
    { displayName: "Ana", isCurrentUser: true, userId: "user-ana" },
    { displayName: "Beto", isCurrentUser: false, userId: "user-beto" },
  ],
  errorMessage: null,
  isEnabled: true,
  nameOf: (itemId) => (itemId === ITEM_ID ? "Beto" : ASSIGNEE_TEXT.UNASSIGNED),
  onClose: vi.fn(),
  onOpen: vi.fn(),
  onSelect: vi.fn(),
  openItemId: null,
  savingItemId: null,
  selectedIdOf: (itemId) => (itemId === ITEM_ID ? "user-beto" : null),
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(cleanup);

describe("AssigneeField", () => {
  it("draws nothing when the setting of the list is off", () => {
    const page = createAssigneeFieldPage();

    render(<AssigneeField itemId={ITEM_ID} viewModel={baseViewModel({ isEnabled: false })} />);

    expect(page.queryFieldButton()).toBeNull();
  });

  it("shows who is the assignee, with a name that says how to change it", () => {
    const page = createAssigneeFieldPage();

    render(<AssigneeField itemId={ITEM_ID} viewModel={baseViewModel()} />);

    expect(page.getFieldButton()).toHaveTextContent("Encargado: Beto");
    expect(page.getFieldButton()).toHaveAccessibleName("Encargado: Beto. Cambiar");
  });

  it("shows 'Sin asignar' for an item without an assignee", () => {
    const page = createAssigneeFieldPage();

    render(<AssigneeField itemId={OTHER_ITEM_ID} viewModel={baseViewModel()} />);

    expect(page.getFieldButton()).toHaveTextContent("Encargado: Sin asignar");
  });

  it("opens the picker for its own item when the button is pressed", async () => {
    const page = createAssigneeFieldPage();
    const viewModel = baseViewModel();
    render(<AssigneeField itemId={ITEM_ID} viewModel={viewModel} />);

    await page.openPicker();

    expect(viewModel.onOpen).toHaveBeenCalledWith(ITEM_ID);
  });

  it("does not show the picker of another item", () => {
    const page = createAssigneeFieldPage();

    render(<AssigneeField itemId={ITEM_ID} viewModel={baseViewModel({ openItemId: OTHER_ITEM_ID })} />);

    expect(page.queryPicker()).toBeNull();
  });

  it("lists 'Sin asignar' and the people of the list, marking the current user and the chosen one", () => {
    const page = createAssigneeFieldPage();

    render(<AssigneeField itemId={ITEM_ID} viewModel={baseViewModel({ openItemId: ITEM_ID })} />);

    expect(page.getOptionLabels()).toEqual(["Sin asignar", "Ana (tú)", "Beto"]);
    expect(page.getOption("Beto")).toHaveAttribute("aria-pressed", "true");
    expect(page.getOption("Ana (tú)")).toHaveAttribute("aria-pressed", "false");
  });

  it("chooses a person", async () => {
    const page = createAssigneeFieldPage();
    const viewModel = baseViewModel({ openItemId: ITEM_ID });
    render(<AssigneeField itemId={ITEM_ID} viewModel={viewModel} />);

    await page.chooseOption("Ana (tú)");

    expect(viewModel.onSelect).toHaveBeenCalledWith(ITEM_ID, "user-ana");
  });

  it("clears the assignee with 'Sin asignar'", async () => {
    const page = createAssigneeFieldPage();
    const viewModel = baseViewModel({ openItemId: ITEM_ID });
    render(<AssigneeField itemId={ITEM_ID} viewModel={viewModel} />);

    await page.chooseOption(ASSIGNEE_TEXT.UNASSIGNED);

    expect(viewModel.onSelect).toHaveBeenCalledWith(ITEM_ID, null);
  });

  it("closes with Cancelar and with Escape", async () => {
    const page = createAssigneeFieldPage();
    const viewModel = baseViewModel({ openItemId: ITEM_ID });
    render(<AssigneeField itemId={ITEM_ID} viewModel={viewModel} />);

    await page.cancel();
    await page.pressEscape();

    expect(viewModel.onClose).toHaveBeenCalledTimes(2);
  });

  it("disables every option while saving", () => {
    const page = createAssigneeFieldPage();

    render(<AssigneeField itemId={ITEM_ID} viewModel={baseViewModel({ openItemId: ITEM_ID, savingItemId: ITEM_ID })} />);

    expect(page.getOption("Ana (tú)")).toBeDisabled();
    expect(page.getOption(ASSIGNEE_TEXT.UNASSIGNED)).toBeDisabled();
  });

  it("shows the error inside the picker", () => {
    const page = createAssigneeFieldPage();

    render(
      <AssigneeField
        itemId={ITEM_ID}
        viewModel={baseViewModel({ errorMessage: ASSIGNEE_TEXT.ERROR_SAVE, openItemId: ITEM_ID })}
      />,
    );

    expect(page.queryAlert()).toHaveTextContent(ASSIGNEE_TEXT.ERROR_SAVE);
  });

  it("gives the focus back to the button when the picker closes", () => {
    const page = createAssigneeFieldPage();
    const { rerender } = render(<AssigneeField itemId={ITEM_ID} viewModel={baseViewModel({ openItemId: ITEM_ID })} />);

    rerender(<AssigneeField itemId={ITEM_ID} viewModel={baseViewModel({ openItemId: null })} />);

    expect(page.getFieldButton()).toHaveFocus();
  });
});
