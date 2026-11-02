// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShortfallResolutionPanel } from "../components/ShortfallResolutionPanel";
import { UndoResolutionDialog } from "../components/UndoResolutionDialog";
import type { ShortfallPanelViewModel, UndoUncheckViewModel } from "../models/shortfall-resolution.types";
import { createShortfallResolutionPage } from "./ShortfallResolutionPanel.page";

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

const TRES_LECHES_NOTE = "+ 600 ml necesarios para Tres leches";
const FLAN_NOTE = "+ 200 ml necesarios para Flan";
const GALON = {
  accessibleLabel: "3780 ml, ₡2 300",
  priceLabel: "₡2 300",
  sizeLabel: "3780 ml",
  variantId: "variant-galon",
};

const createPanel = (overrides: Partial<ShortfallPanelViewModel> = {}): ShortfallPanelViewModel => ({
  errorMessage: null,
  hasNoOtherPresentations: false,
  isBusy: false,
  isLoadingPresentations: false,
  isOpen: true,
  isStillShort: false,
  isViewingPresentations: false,
  notes: [TRES_LECHES_NOTE, FLAN_NOTE],
  onBack: vi.fn(),
  onClose: vi.fn(),
  onHadEnough: vi.fn(),
  onOtherPresentation: vi.fn(),
  onPickPresentation: vi.fn(),
  onRetryPresentations: vi.fn(),
  onSameAgain: vi.fn(),
  presentations: [],
  presentationsErrorMessage: null,
  productLabel: "Leche Dos Pinos (1000 ml)",
  ...overrides,
});

const createUndoDialog = (overrides: Partial<UndoUncheckViewModel> = {}): UndoUncheckViewModel => ({
  errorMessage: null,
  isOpen: true,
  isReverting: false,
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
  returnsToText: "La fila vuelve a 1 × Leche Dos Pinos (1000 ml).",
  ...overrides,
});

describe("ShortfallResolutionPanel (HU-77)", () => {
  it("shows the row and all its shortfalls under the title \"¿Qué hiciste?\" (CA-01)", () => {
    render(<ShortfallResolutionPanel panel={createPanel()} />);
    const page = createShortfallResolutionPage();

    expect(page.getPanel()).toHaveTextContent("Leche Dos Pinos (1000 ml)");
    expect(page.getNoteTexts()).toEqual([TRES_LECHES_NOTE, FLAN_NOTE]);
  });

  it("offers the three one-tap choices and runs the one picked (CA-02)", async () => {
    const panel = createPanel();
    render(<ShortfallResolutionPanel panel={panel} />);
    const page = createShortfallResolutionPage();

    await page.click(page.getSameAgainButton());

    expect(panel.onSameAgain).toHaveBeenCalledTimes(1);
    expect(page.getOtherPresentationButton()).toBeEnabled();
    expect(page.getHadEnoughButton()).toBeEnabled();
  });

  it("closes without choosing with \"Ahora no\"", async () => {
    const panel = createPanel();
    render(<ShortfallResolutionPanel panel={panel} />);
    const page = createShortfallResolutionPage();

    await page.click(page.getNotNowButton());

    expect(panel.onClose).toHaveBeenCalledTimes(1);
  });

  it("says what is still missing when the panel stays open (rule 39)", () => {
    render(<ShortfallResolutionPanel panel={createPanel({ isStillShort: true, notes: [FLAN_NOTE] })} />);
    const page = createShortfallResolutionPage();

    expect(page.queryText("Todavía falta:")).toBeInTheDocument();
    expect(page.getNoteTexts()).toEqual([FLAN_NOTE]);
  });

  it("disables every choice while saving", () => {
    render(<ShortfallResolutionPanel panel={createPanel({ isBusy: true })} />);
    const page = createShortfallResolutionPage();

    expect(page.getSameAgainButton()).toHaveTextContent("Guardando…");
    expect(page.getSameAgainButton()).toBeDisabled();
    expect(page.getHadEnoughButton()).toBeDisabled();
    expect(page.getNotNowButton()).toBeDisabled();
  });

  it("shows the presentations with size and price inside the same panel, without marking any (CA-03, CA-04)", async () => {
    const panel = createPanel({ isViewingPresentations: true, presentations: [GALON] });
    render(<ShortfallResolutionPanel panel={panel} />);
    const page = createShortfallResolutionPage();

    const galonButton = page.getPresentationButton(GALON.accessibleLabel);
    expect(galonButton).not.toHaveAttribute("aria-pressed");
    expect(page.queryText("Ordenadas por precio aproximado, de menor a mayor.")).toBeInTheDocument();

    await page.click(galonButton);

    expect(panel.onPickPresentation).toHaveBeenCalledWith("variant-galon");
  });

  it("goes back to the three choices", async () => {
    const panel = createPanel({ isViewingPresentations: true, presentations: [GALON] });
    render(<ShortfallResolutionPanel panel={panel} />);
    const page = createShortfallResolutionPage();

    await page.click(page.getBackButton());

    expect(panel.onBack).toHaveBeenCalledTimes(1);
  });

  it("shows the save error as an alert", () => {
    render(<ShortfallResolutionPanel panel={createPanel({ errorMessage: "No se pudo guardar lo que hiciste." })} />);
    const page = createShortfallResolutionPage();

    expect(page.getAlert()).toHaveTextContent("No se pudo guardar lo que hiciste.");
  });

  it("renders nothing while closed", () => {
    render(<ShortfallResolutionPanel panel={createPanel({ isOpen: false })} />);
    const page = createShortfallResolutionPage();

    expect(page.queryPanel()).toBeNull();
  });
});

describe("UndoResolutionDialog (rule 45)", () => {
  it("says what the row goes back to and that manual changes are lost", () => {
    render(<UndoResolutionDialog dialog={createUndoDialog()} />);
    const page = createShortfallResolutionPage();

    expect(page.getUndoDialog()).toHaveTextContent("La fila vuelve a 1 × Leche Dos Pinos (1000 ml).");
    expect(page.getUndoDialog()).toHaveTextContent("También se pierde lo que cambiaste a mano después.");
  });

  it("confirms or cancels", async () => {
    const dialog = createUndoDialog();
    render(<UndoResolutionDialog dialog={dialog} />);
    const page = createShortfallResolutionPage();

    await page.click(page.getUndoConfirmButton());
    await page.click(page.getUndoCancelButton());

    expect(dialog.onConfirm).toHaveBeenCalledTimes(1);
    expect(dialog.onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons while undoing", () => {
    render(<UndoResolutionDialog dialog={createUndoDialog({ isReverting: true })} />);
    const page = createShortfallResolutionPage();

    expect(page.getUndoConfirmButton()).toHaveTextContent("Destachando…");
    expect(page.getUndoConfirmButton()).toBeDisabled();
    expect(page.getUndoCancelButton()).toBeDisabled();
  });
});
