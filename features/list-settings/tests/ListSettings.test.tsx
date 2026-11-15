// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTE } from "@/constants";
import { ListSettings } from "../ListSettings";
import {
  LIST_SETTINGS_TEXT,
  SET_ASSIGNEE_ENABLED_RESULT,
  SET_ASSIGNEE_ENABLED_RESULT_MESSAGE,
} from "../constants/list-settings.constants";
import type { SettableList } from "../models/SettableList.interface";
import { getSettableLists, setAssigneeEnabled } from "../services/list-settings.service";
import { createListSettingsPage } from "./ListSettings.page";

vi.mock("../services/list-settings.service", () => ({ getSettableLists: vi.fn(), setAssigneeEnabled: vi.fn() }));
const getSettableListsMock = vi.mocked(getSettableLists);
const setAssigneeEnabledMock = vi.mocked(setAssigneeEnabled);

const GENERAL: SettableList = { id: "list-general", isEnabled: false, label: "Lista general" };
const SUBLIST: SettableList = { id: "date-1", isEnabled: true, label: "Cumple · 20/12/2099" };

// Sin globals de Vitest, Testing Library no limpia el DOM sola entre tests.
afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
  getSettableListsMock.mockResolvedValue([GENERAL, SUBLIST]);
  setAssigneeEnabledMock.mockResolvedValue(SET_ASSIGNEE_ENABLED_RESULT.SAVED);
});

const renderLoaded = async (): Promise<ReturnType<typeof createListSettingsPage>> => {
  render(<ListSettings />);
  const page = createListSettingsPage();
  await screen.findByRole("switch", { name: /Lista general/u });
  return page;
};

describe("ListSettings", () => {
  // SCRUM-108, CA-01: ajustes por lista, no uno global.
  it("shows the title and one 'Encargado' switch per list", async () => {
    const page = await renderLoaded();

    expect(page.getHeading()).toBeInTheDocument();
    expect(page.getSwitchCount()).toBe(2);
    expect(screen.getByText(LIST_SETTINGS_TEXT.ASSIGNEE_DESCRIPTION)).toBeInTheDocument();
  });

  it("links back to the profile", async () => {
    const page = await renderLoaded();

    expect(page.getBackLink()).toHaveAttribute("href", APP_ROUTE.PROFILE);
  });

  // SCRUM-108, CA-02: apagado por defecto.
  it("shows each switch as the list has it: off by default and on when it was turned on", async () => {
    const page = await renderLoaded();

    expect(page.getSwitch(GENERAL.label)).toHaveAttribute("aria-checked", "false");
    expect(page.getSwitch(SUBLIST.label)).toHaveAttribute("aria-checked", "true");
  });

  it("turns the setting on for one list and leaves the other as it was", async () => {
    const page = await renderLoaded();

    await page.toggle(GENERAL.label);

    await waitFor(() => expect(page.getSwitch(GENERAL.label)).toHaveAttribute("aria-checked", "true"));
    expect(setAssigneeEnabledMock).toHaveBeenCalledWith(GENERAL.id, true);
    expect(page.getSwitch(SUBLIST.label)).toHaveAttribute("aria-checked", "true");
  });

  it("turns the setting off", async () => {
    const page = await renderLoaded();

    await page.toggle(SUBLIST.label);

    await waitFor(() => expect(page.getSwitch(SUBLIST.label)).toHaveAttribute("aria-checked", "false"));
    expect(setAssigneeEnabledMock).toHaveBeenCalledWith(SUBLIST.id, false);
  });

  it("keeps the switch as it was and shows the error next to the list when saving fails", async () => {
    setAssigneeEnabledMock.mockResolvedValue(SET_ASSIGNEE_ENABLED_RESULT.ERROR);
    const page = await renderLoaded();

    await page.toggle(GENERAL.label);

    await waitFor(() =>
      expect(page.queryRowAlert(GENERAL.label)).toHaveTextContent(
        SET_ASSIGNEE_ENABLED_RESULT_MESSAGE[SET_ASSIGNEE_ENABLED_RESULT.ERROR],
      ),
    );
    expect(page.getSwitch(GENERAL.label)).toHaveAttribute("aria-checked", "false");
    expect(page.queryRowAlert(SUBLIST.label)).toBeNull();
  });

  it("shows a spinner while the lists load and no switches yet", () => {
    getSettableListsMock.mockReturnValue(new Promise(() => undefined));
    render(<ListSettings />);
    const page = createListSettingsPage();

    expect(page.getSwitchCount()).toBe(0);
  });

  it("shows the empty state when the person has no lists", async () => {
    getSettableListsMock.mockResolvedValue([]);
    render(<ListSettings />);
    const page = createListSettingsPage();

    expect(await screen.findByText(LIST_SETTINGS_TEXT.EMPTY)).toBeInTheDocument();
    expect(page.getSwitchCount()).toBe(0);
  });

  it("shows an error with a retry when the lists do not load", async () => {
    getSettableListsMock.mockRejectedValueOnce(new Error("sin red"));
    render(<ListSettings />);
    const page = createListSettingsPage();

    expect(await screen.findByText(LIST_SETTINGS_TEXT.LOAD_ERROR)).toBeInTheDocument();
    await page.retry();

    expect(await screen.findByRole("switch", { name: /Lista general/u })).toBeInTheDocument();
  });
});
