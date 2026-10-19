// @vitest-environment jsdom
import { cleanup, render, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Household } from "../Household";
import { HouseholdMembersSection } from "../components/HouseholdMembersSection";
import type { HouseholdMembersSectionProps } from "../components/models/HouseholdMembersSectionProps.interface";
import {
  HOUSEHOLD_LEAVE_TEXT,
  HOUSEHOLD_MEMBERS_TEXT,
  HOUSEHOLD_ROLE,
} from "../constants/household.constants";
import type { HouseholdMember } from "../models/HouseholdMember.interface";
import {
  getHouseholdInvite,
  getHouseholdMembersPage,
  getHouseholdMembership,
  hasRegisteredSession,
} from "../services/household.service";
import { createHouseholdMembersPage } from "./HouseholdMembers.page";

// La pantalla con el servicio falso: sin Supabase ni sesión real.
vi.mock("../services/household.service", () => ({
  acceptHouseholdInvite: vi.fn(),
  createHousehold: vi.fn(),
  createHouseholdInvite: vi.fn(),
  getHouseholdInvite: vi.fn(),
  getHouseholdMembers: vi.fn(),
  getHouseholdMembersPage: vi.fn(),
  getHouseholdMembership: vi.fn(),
  // Ya decidió qué hacer con su lista (literal: el factory de vi.mock no
  // puede usar las constantes).
  getPersonalListsDecisionState: vi.fn(() => Promise.resolve("decided")),
  hasRegisteredSession: vi.fn(),
  leaveHousehold: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
const sessionMock = vi.mocked(hasRegisteredSession);
const membershipMock = vi.mocked(getHouseholdMembership);
const inviteMock = vi.mocked(getHouseholdInvite);
const pageMock = vi.mocked(getHouseholdMembersPage);

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

describe("HouseholdMembersSection", () => {
  const ANA_ROW = { initials: "AP", isAdmin: true, isCurrentUser: false, label: "Ana Pérez", rowKey: "row-ana" };
  const BETO_ROW = { initials: "B", isAdmin: false, isCurrentUser: true, label: "Beto", rowKey: "row-beto" };
  const UNNAMED_ROW = {
    initials: null,
    isAdmin: false,
    isCurrentUser: false,
    label: HOUSEHOLD_LEAVE_TEXT.UNNAMED_MEMBER,
    rowKey: "row-unnamed",
  };

  const createProps = (overrides: Partial<HouseholdMembersSectionProps> = {}): HouseholdMembersSectionProps => ({
    countText: "3 integrantes",
    errorMessage: null,
    hasMore: false,
    hasNoResults: false,
    isLoading: false,
    isLoadingMore: false,
    loadMoreErrorMessage: null,
    onLoadMore: vi.fn(),
    onQueryChange: vi.fn(),
    onRetry: vi.fn(),
    query: "",
    rows: [ANA_ROW, BETO_ROW, UNNAMED_ROW],
    ...overrides,
  });

  it("shows each member with their initials or a generic icon (CA-01)", () => {
    render(<HouseholdMembersSection {...createProps()} />);
    const page = createHouseholdMembersPage();

    expect(page.getRows()).toHaveLength(3);
    expect(page.getRow("Ana Pérez")).toHaveTextContent("AP");
    // Sin nombre: "Miembro sin nombre" y la silueta en vez de iniciales.
    const unnamedAvatar = page.getRow(HOUSEHOLD_LEAVE_TEXT.UNNAMED_MEMBER)?.querySelector('[aria-hidden="true"]');
    expect(unnamedAvatar?.querySelector("svg")).not.toBeNull();
  });

  it("marks only the admin as admin and only the current user with «Tú» (CA-03)", () => {
    render(<HouseholdMembersSection {...createProps()} />);
    const page = createHouseholdMembersPage();
    const anaRow = page.getRow("Ana Pérez") as HTMLElement;
    const betoRow = page.getRow("Beto") as HTMLElement;

    expect(within(anaRow).getByText(HOUSEHOLD_MEMBERS_TEXT.ADMIN)).toBeInTheDocument();
    expect(within(anaRow).queryByText(HOUSEHOLD_MEMBERS_TEXT.CURRENT_USER)).not.toBeInTheDocument();
    expect(within(betoRow).getByText(HOUSEHOLD_MEMBERS_TEXT.CURRENT_USER)).toBeInTheDocument();
    expect(within(betoRow).queryByText(HOUSEHOLD_MEMBERS_TEXT.ADMIN)).not.toBeInTheDocument();
  });

  it("hides the avatar from screen readers: the name is already there", () => {
    render(<HouseholdMembersSection {...createProps()} />);
    const page = createHouseholdMembersPage();

    expect(within(page.getRow("Ana Pérez") as HTMLElement).getByText("AP")).toHaveAttribute("aria-hidden", "true");
  });

  it("announces the count, or that nobody matches the search (CA-02)", () => {
    const { rerender } = render(<HouseholdMembersSection {...createProps()} />);
    const page = createHouseholdMembersPage();

    expect(page.getStatus()).toHaveTextContent("3 integrantes");

    rerender(<HouseholdMembersSection {...createProps({ countText: null, hasNoResults: true, rows: [] })} />);

    expect(page.getStatus()).toHaveTextContent(HOUSEHOLD_MEMBERS_TEXT.NO_RESULTS);
    expect(page.getRows()).toHaveLength(0);
  });

  it("sends what the user types in the search field", async () => {
    const onQueryChange = vi.fn();
    render(<HouseholdMembersSection {...createProps({ onQueryChange })} />);
    const page = createHouseholdMembersPage();

    await page.search("a");

    expect(onQueryChange).toHaveBeenCalledWith("a");
  });

  it("shows the error with a retry button", async () => {
    const onRetry = vi.fn();
    render(
      <HouseholdMembersSection
        {...createProps({ countText: null, errorMessage: HOUSEHOLD_MEMBERS_TEXT.LOAD_ERROR, onRetry, rows: [] })}
      />,
    );
    const page = createHouseholdMembersPage();

    expect(page.queryAlert()).toHaveTextContent(HOUSEHOLD_MEMBERS_TEXT.LOAD_ERROR);
    await page.retry();

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("offers «Cargar más» only when there are more members (CA-02)", async () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(<HouseholdMembersSection {...createProps({ hasMore: true, onLoadMore })} />);
    const page = createHouseholdMembersPage();

    await page.loadMore();
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    rerender(<HouseholdMembersSection {...createProps({ hasMore: false })} />);
    expect(page.queryLoadMoreButton()).not.toBeInTheDocument();
  });

  it("disables «Cargar más» while loading and keeps the list when it fails", () => {
    const { rerender } = render(<HouseholdMembersSection {...createProps({ hasMore: true, isLoadingMore: true })} />);
    const page = createHouseholdMembersPage();

    expect(page.getLoadingMoreButton()).toBeDisabled();

    rerender(
      <HouseholdMembersSection
        {...createProps({ hasMore: true, loadMoreErrorMessage: HOUSEHOLD_MEMBERS_TEXT.LOAD_MORE_ERROR })}
      />,
    );

    expect(page.queryAlert()).toHaveTextContent(HOUSEHOLD_MEMBERS_TEXT.LOAD_MORE_ERROR);
    expect(page.getLoadMoreButton()).toBeEnabled();
    expect(page.getRows()).toHaveLength(3);
  });
});

describe("Household: family members", () => {
  // Ids y nombres inventados (no son de la base).
  const ANA: HouseholdMember = {
    displayName: "Ana Pérez",
    isCurrentUser: false,
    role: HOUSEHOLD_ROLE.ADMIN,
    userId: "user-ana-0001",
  };
  const BETO: HouseholdMember = {
    displayName: "Beto",
    isCurrentUser: true,
    role: HOUSEHOLD_ROLE.MEMBER,
    userId: "user-beto-0002",
  };
  const UNNAMED: HouseholdMember = {
    displayName: null,
    isCurrentUser: false,
    role: HOUSEHOLD_ROLE.MEMBER,
    userId: "user-unnamed-0003",
  };

  beforeEach(() => {
    vi.resetAllMocks();
    sessionMock.mockResolvedValue(true);
    inviteMock.mockResolvedValue(null);
    membershipMock.mockResolvedValue({ householdName: "Familia Alpízar", role: HOUSEHOLD_ROLE.MEMBER });
    pageMock.mockResolvedValue({ hasMore: false, members: [ANA, BETO, UNNAMED] });
  });

  it("lists the family with the admin and «Tú» marked, without ids in the page (CA-01, CA-03)", async () => {
    const { container } = render(<Household />);
    const page = createHouseholdMembersPage();

    await page.findSection();
    await waitFor(() => expect(page.getRows()).toHaveLength(3));

    expect(pageMock).toHaveBeenCalledWith("", 0);
    expect(within(page.getRow("Ana Pérez") as HTMLElement).getByText(HOUSEHOLD_MEMBERS_TEXT.ADMIN)).toBeInTheDocument();
    expect(within(page.getRow("Beto") as HTMLElement).getByText(HOUSEHOLD_MEMBERS_TEXT.CURRENT_USER)).toBeInTheDocument();
    expect(page.getRow(HOUSEHOLD_LEAVE_TEXT.UNNAMED_MEMBER)).toBeDefined();
    expect(page.getStatus()).toHaveTextContent("3 integrantes");
    // El id solo es la key de React: nunca llega al HTML.
    expect(container.innerHTML).not.toContain(ANA.userId);
    expect(container.innerHTML).not.toContain(BETO.userId);
    expect(container.innerHTML).not.toContain(UNNAMED.userId);
  });

  it("does not show nor load the section without a family", async () => {
    membershipMock.mockResolvedValue(null);
    render(<Household />);
    const page = createHouseholdMembersPage();

    // Ya se ve la pantalla "sin familia".
    await waitFor(() => expect(membershipMock).toHaveBeenCalled());
    await waitFor(() => expect(page.querySection()).not.toBeInTheDocument());
    expect(pageMock).not.toHaveBeenCalled();
  });

  it("searches by name and says when nobody matches (CA-02)", async () => {
    render(<Household />);
    const page = createHouseholdMembersPage();
    await page.findSection();
    await waitFor(() => expect(page.getRows()).toHaveLength(3));
    pageMock.mockResolvedValue({ hasMore: false, members: [] });

    await page.search("zz");

    await waitFor(() => expect(page.getStatus()).toHaveTextContent(HOUSEHOLD_MEMBERS_TEXT.NO_RESULTS));
    expect(pageMock).toHaveBeenLastCalledWith("zz", 0);
    expect(page.getRows()).toHaveLength(0);
  });

  it("shows the error and loads the list again on retry", async () => {
    pageMock.mockRejectedValueOnce(new Error("network"));
    render(<Household />);
    const page = createHouseholdMembersPage();
    await page.findSection();

    expect(await page.findAlert()).toHaveTextContent(HOUSEHOLD_MEMBERS_TEXT.LOAD_ERROR);
    await page.retry();

    await waitFor(() => expect(page.getRows()).toHaveLength(3));
    expect(page.queryAlert()).not.toBeInTheDocument();
  });

  it("appends the next page with «Cargar más» (CA-02)", async () => {
    pageMock
      .mockResolvedValueOnce({ hasMore: true, members: [ANA, BETO] })
      .mockResolvedValueOnce({ hasMore: false, members: [UNNAMED] });
    render(<Household />);
    const page = createHouseholdMembersPage();
    await page.findSection();
    await page.findLoadMoreButton();

    await page.loadMore();

    await waitFor(() => expect(page.getRows()).toHaveLength(3));
    expect(pageMock).toHaveBeenLastCalledWith("", 2);
    expect(page.queryLoadMoreButton()).not.toBeInTheDocument();
  });
});
