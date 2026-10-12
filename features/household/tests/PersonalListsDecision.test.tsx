// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Household } from "../Household";
import { HouseholdInvitation } from "../HouseholdInvitation";
import { PersonalListsDecision } from "../components/PersonalListsDecision";
import type { PersonalListsDecisionProps } from "../components/models/PersonalListsDecisionProps.interface";
import {
  HOUSEHOLD_JOIN_RESULT,
  HOUSEHOLD_LISTS_CHOICE,
  HOUSEHOLD_LISTS_DECISION_RESULT,
  HOUSEHOLD_LISTS_DECISION_STATE,
  HOUSEHOLD_LISTS_DECISION_TEXT,
  HOUSEHOLD_ROLE,
} from "../constants/household.constants";
import {
  acceptHouseholdInvite,
  decidePersonalLists,
  getHouseholdInvite,
  getHouseholdMembership,
  getPersonalListsDecisionState,
  hasRegisteredSession,
} from "../services/household.service";
import { createPersonalListsDecisionPage } from "./PersonalListsDecision.page";

// Las pantallas con el servicio falso: sin Supabase ni sesión real.
vi.mock("../services/household.service", () => ({
  acceptHouseholdInvite: vi.fn(),
  createHousehold: vi.fn(),
  createHouseholdInvite: vi.fn(),
  decidePersonalLists: vi.fn(),
  getHouseholdInvite: vi.fn(),
  getHouseholdMembers: vi.fn(),
  getHouseholdMembership: vi.fn(),
  getPersonalListsDecisionState: vi.fn(),
  hasRegisteredSession: vi.fn(),
  leaveHousehold: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
const sessionMock = vi.mocked(hasRegisteredSession);
const membershipMock = vi.mocked(getHouseholdMembership);
const inviteMock = vi.mocked(getHouseholdInvite);
const acceptMock = vi.mocked(acceptHouseholdInvite);
const stateMock = vi.mocked(getPersonalListsDecisionState);
const decideMock = vi.mocked(decidePersonalLists);

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

// Token inventado con formato de UUID (no es uno real de la base).
const TOKEN = "3f2b8c1e-9a4d-4e7b-8c6f-1a2b3c4d5e6f";

describe("PersonalListsDecision", () => {
  const createProps = (overrides: Partial<PersonalListsDecisionProps> = {}): PersonalListsDecisionProps => ({
    errorMessage: null,
    isSaving: false,
    onKeep: vi.fn(),
    onShare: vi.fn(),
    ...overrides,
  });

  it("asks the question with both options equally available (CA-01)", () => {
    render(<PersonalListsDecision {...createProps()} />);
    const page = createPersonalListsDecisionPage();

    expect(page.getQuestion()).toHaveTextContent(HOUSEHOLD_LISTS_DECISION_TEXT.DESCRIPTION);
    expect(page.getKeepButton()).toBeEnabled();
    expect(page.getShareButton()).toBeEnabled();
    // Mismo peso visual: las dos opciones con la misma variante del botón.
    expect(page.getKeepButton().className).toBe(page.getShareButton().className);
  });

  it("calls onKeep when keeping", async () => {
    const onKeep = vi.fn();
    render(<PersonalListsDecision {...createProps({ onKeep })} />);
    const page = createPersonalListsDecisionPage();

    await page.keep();

    expect(onKeep).toHaveBeenCalledTimes(1);
  });

  it("calls onShare when sharing", async () => {
    const onShare = vi.fn();
    render(<PersonalListsDecision {...createProps({ onShare })} />);
    const page = createPersonalListsDecisionPage();

    await page.share();

    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it("disables both options while saving", () => {
    render(<PersonalListsDecision {...createProps({ isSaving: true })} />);
    const page = createPersonalListsDecisionPage();

    expect(page.getKeepButton()).toBeDisabled();
    expect(page.getShareButton()).toBeDisabled();
    expect(page.getQuestion()).toHaveAttribute("aria-busy", "true");
  });

  it("announces the error as an alert", () => {
    render(<PersonalListsDecision {...createProps({ errorMessage: HOUSEHOLD_LISTS_DECISION_TEXT.SAVE_ERROR })} />);
    const page = createPersonalListsDecisionPage();

    expect(page.getError()).toHaveTextContent(HOUSEHOLD_LISTS_DECISION_TEXT.SAVE_ERROR);
  });
});

describe("Mi familia: the personal lists question", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sessionMock.mockResolvedValue(true);
    inviteMock.mockResolvedValue(null);
    membershipMock.mockResolvedValue({ householdName: "Familia Alpízar", role: HOUSEHOLD_ROLE.ADMIN });
    stateMock.mockResolvedValue(HOUSEHOLD_LISTS_DECISION_STATE.PENDING);
  });

  it("asks a member who has pending items, then shows the shared notice", async () => {
    decideMock.mockResolvedValue(HOUSEHOLD_LISTS_DECISION_RESULT.SHARED);
    render(<Household />);
    const page = createPersonalListsDecisionPage();

    await page.findQuestion();
    await page.share();

    expect(await page.findNotice(HOUSEHOLD_LISTS_DECISION_TEXT.SHARED)).toBeInTheDocument();
    expect(page.queryQuestion()).not.toBeInTheDocument();
    expect(decideMock).toHaveBeenCalledWith(HOUSEHOLD_LISTS_CHOICE.SHARE);
  });

  it("tells the member what stayed in the personal list when sharing was partial", async () => {
    decideMock.mockResolvedValue(HOUSEHOLD_LISTS_DECISION_RESULT.SHARED_PARTIALLY);
    render(<Household />);
    const page = createPersonalListsDecisionPage();

    await page.findQuestion();
    await page.share();

    expect(await page.findNotice(HOUSEHOLD_LISTS_DECISION_TEXT.SHARED_PARTIALLY)).toBeInTheDocument();
    expect(page.queryQuestion()).not.toBeInTheDocument();
  });

  it("tells the member that nothing was shared when everything was already bought", async () => {
    decideMock.mockResolvedValue(HOUSEHOLD_LISTS_DECISION_RESULT.NOTHING_SHARED);
    render(<Household />);
    const page = createPersonalListsDecisionPage();

    await page.findQuestion();
    await page.share();

    expect(await page.findNotice(HOUSEHOLD_LISTS_DECISION_TEXT.NOTHING_SHARED)).toBeInTheDocument();
    expect(page.queryQuestion()).not.toBeInTheDocument();
  });

  it("does not ask when there is nothing to decide", async () => {
    stateMock.mockResolvedValue(HOUSEHOLD_LISTS_DECISION_STATE.NOTHING_TO_DECIDE);
    render(<Household />);
    const page = createPersonalListsDecisionPage();

    await vi.waitFor(() => expect(stateMock).toHaveBeenCalledTimes(1));
    expect(page.queryQuestion()).not.toBeInTheDocument();
  });

  it("does not ask without a household", async () => {
    membershipMock.mockResolvedValue(null);
    render(<Household />);

    await vi.waitFor(() => expect(membershipMock).toHaveBeenCalled());
    expect(stateMock).not.toHaveBeenCalled();
  });
});

describe("Invitation page: the personal lists question right after joining", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sessionMock.mockResolvedValue(true);
    acceptMock.mockResolvedValue(HOUSEHOLD_JOIN_RESULT.JOINED);
    stateMock.mockResolvedValue(HOUSEHOLD_LISTS_DECISION_STATE.PENDING);
    decideMock.mockResolvedValue(HOUSEHOLD_LISTS_DECISION_RESULT.KEPT);
  });

  it("asks right after joining and keeps the list (CA-01, CA-03)", async () => {
    render(<HouseholdInvitation token={TOKEN} />);
    const page = createPersonalListsDecisionPage();

    await page.join();
    await page.findQuestion();
    await page.keep();

    expect(await page.findNotice(HOUSEHOLD_LISTS_DECISION_TEXT.KEPT)).toBeInTheDocument();
    expect(decideMock).toHaveBeenCalledWith(HOUSEHOLD_LISTS_CHOICE.KEEP);
  });

  it("does not ask before joining", async () => {
    render(<HouseholdInvitation token={TOKEN} />);

    await vi.waitFor(() => expect(sessionMock).toHaveBeenCalled());
    expect(stateMock).not.toHaveBeenCalled();
  });
});
