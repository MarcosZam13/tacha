// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOUSEHOLD_JOIN_RESULT, HOUSEHOLD_JOIN_TEXT, HOUSEHOLD_ROUTE } from "../constants/household.constants";
import { HouseholdInvitation } from "../HouseholdInvitation";
import { acceptHouseholdInvite, hasRegisteredSession } from "../services/household.service";
import { createHouseholdInvitationPage } from "./HouseholdInvitation.page";

vi.mock("../services/household.service", () => ({
  acceptHouseholdInvite: vi.fn(),
  hasRegisteredSession: vi.fn(),
}));

const hasRegisteredSessionMock = vi.mocked(hasRegisteredSession);
const acceptHouseholdInviteMock = vi.mocked(acceptHouseholdInvite);

const TOKEN = "3f2b8c1e-9a4d-4e7b-8c6f-1a2b3c4d5e6f";

describe("HouseholdInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Sin globals de Vitest, Testing Library no desmonta solo entre tests:
  // sin esto, el DOM de un test queda en el siguiente.
  afterEach(() => {
    cleanup();
  });

  it("shows the Unirme button and the invitation text for a registered user", async () => {
    hasRegisteredSessionMock.mockResolvedValue(true);
    render(<HouseholdInvitation token={TOKEN} />);
    const page = createHouseholdInvitationPage();

    expect(await page.findJoinButton()).toBeEnabled();
    expect(page.getPageText()).toContain(HOUSEHOLD_JOIN_TEXT.DESCRIPTION);
  });

  it("links to the household after joining and never shows the token", async () => {
    hasRegisteredSessionMock.mockResolvedValue(true);
    acceptHouseholdInviteMock.mockResolvedValue(HOUSEHOLD_JOIN_RESULT.JOINED);
    render(<HouseholdInvitation token={TOKEN} />);
    const page = createHouseholdInvitationPage();

    await page.join();

    expect(await page.findHouseholdLink()).toHaveAttribute("href", HOUSEHOLD_ROUTE.HOUSEHOLD);
    expect(page.getPageText()).toContain(HOUSEHOLD_JOIN_TEXT.JOINED);
    expect(page.getPageText()).not.toContain(TOKEN);
  });

  it("links to the login when there is no registered session", async () => {
    hasRegisteredSessionMock.mockResolvedValue(false);
    render(<HouseholdInvitation token={TOKEN} />);
    const page = createHouseholdInvitationPage();

    expect(await page.findLoginLink()).toHaveAttribute("href", HOUSEHOLD_ROUTE.LOGIN);
    expect(page.queryJoinButton()).toBeNull();
  });

  it("shows the invalid message and no Unirme button for a malformed token", async () => {
    render(<HouseholdInvitation token="no-es-un-token" />);
    const page = createHouseholdInvitationPage();

    expect(await page.findAlert()).toHaveTextContent(HOUSEHOLD_JOIN_TEXT.INVALID);
    expect(page.queryJoinButton()).toBeNull();
  });
});
