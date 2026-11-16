import { describe, expect, it } from "vitest";
import { SHORTFALL_PANEL_ACTION, SHORTFALL_PANEL_STATUS } from "../constants/shortfall-resolution.constants";
import type { PresentationOption, ShortfallPanelState } from "../models/shortfall-resolution.types";
import { INITIAL_SHORTFALL_PANEL_STATE, shortfallPanelReducer } from "../utils/shortfall-panel.reducer";

const ITEM_ID = "item-leche";
const PRESENTATION: PresentationOption = {
  accessibleLabel: "3780 ml, ₡2 300",
  priceLabel: "₡2 300",
  sizeLabel: "3780 ml",
  variantId: "variant-galon",
};

const choosing: ShortfallPanelState = { isStillShort: false, itemId: ITEM_ID, status: SHORTFALL_PANEL_STATUS.CHOOSING };
const loadingPresentations: ShortfallPanelState = {
  itemId: ITEM_ID,
  status: SHORTFALL_PANEL_STATUS.LOADING_PRESENTATIONS,
};

describe("shortfallPanelReducer", () => {
  it("opens on the checked row with the three choices (CA-01)", () => {
    const state = shortfallPanelReducer(INITIAL_SHORTFALL_PANEL_STATE, {
      itemId: ITEM_ID,
      type: SHORTFALL_PANEL_ACTION.OPENED,
    });

    expect(state).toEqual(choosing);
  });

  it("ignores choices while the panel is closed", () => {
    const state = shortfallPanelReducer(INITIAL_SHORTFALL_PANEL_STATE, { type: SHORTFALL_PANEL_ACTION.RESOLVE_STARTED });

    expect(state).toEqual(INITIAL_SHORTFALL_PANEL_STATE);
  });

  it("does not start a second save while one is in flight", () => {
    const resolving = shortfallPanelReducer(choosing, { type: SHORTFALL_PANEL_ACTION.RESOLVE_STARTED });

    const state = shortfallPanelReducer(resolving, { type: SHORTFALL_PANEL_ACTION.RESOLVE_STARTED });

    expect(state).toBe(resolving);
  });

  it("stays open with the choices when the row is still short after saving (rule 39)", () => {
    const resolving = shortfallPanelReducer(choosing, { type: SHORTFALL_PANEL_ACTION.RESOLVE_STARTED });

    const state = shortfallPanelReducer(resolving, { type: SHORTFALL_PANEL_ACTION.STILL_SHORT });

    expect(state).toEqual({ isStillShort: true, itemId: ITEM_ID, status: SHORTFALL_PANEL_STATUS.CHOOSING });
  });

  it("keeps the panel open with the message when saving fails", () => {
    const state = shortfallPanelReducer(choosing, {
      errorMessage: "No se pudo guardar",
      type: SHORTFALL_PANEL_ACTION.RESOLVE_FAILED,
    });

    expect(state).toEqual({ errorMessage: "No se pudo guardar", itemId: ITEM_ID, status: SHORTFALL_PANEL_STATUS.FAILED });
  });

  it("shows the presentations inside the same panel (CA-04)", () => {
    const state = shortfallPanelReducer(loadingPresentations, {
      presentations: [PRESENTATION],
      type: SHORTFALL_PANEL_ACTION.PRESENTATIONS_LOADED,
    });

    expect(state).toEqual({
      itemId: ITEM_ID,
      presentations: [PRESENTATION],
      status: SHORTFALL_PANEL_STATUS.CHOOSING_PRESENTATION,
    });
  });

  it("ignores presentations that arrive after going back", () => {
    const backToChoices = shortfallPanelReducer(loadingPresentations, { type: SHORTFALL_PANEL_ACTION.BACK_TO_CHOICES });

    const state = shortfallPanelReducer(backToChoices, {
      presentations: [PRESENTATION],
      type: SHORTFALL_PANEL_ACTION.PRESENTATIONS_LOADED,
    });

    expect(state).toEqual(choosing);
  });

  it("closes from any state", () => {
    const state = shortfallPanelReducer(loadingPresentations, { type: SHORTFALL_PANEL_ACTION.CLOSED });

    expect(state).toEqual(INITIAL_SHORTFALL_PANEL_STATE);
  });
});
