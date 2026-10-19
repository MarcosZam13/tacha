// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Household } from "../Household";
import { HouseholdMembersSection } from "../components/HouseholdMembersSection";
import { HouseholdRemoveMemberDialog } from "../components/HouseholdRemoveMemberDialog";
import type { HouseholdMembersSectionProps } from "../components/models/HouseholdMembersSectionProps.interface";
import type { HouseholdRemoveMemberDialogProps } from "../components/models/HouseholdRemoveMemberDialogProps.interface";
import {
  HOUSEHOLD_LEAVE_TEXT,
  HOUSEHOLD_REMOVE_MEMBER_RESULT,
  HOUSEHOLD_REMOVE_MEMBER_TEXT,
  HOUSEHOLD_ROLE,
} from "../constants/household.constants";
import type { HouseholdMember } from "../models/HouseholdMember.interface";
import {
  getHouseholdInvite,
  getHouseholdMembersPage,
  getHouseholdMembership,
  hasRegisteredSession,
  removeHouseholdMember,
} from "../services/household.service";
import { createHouseholdRemoveMemberPage } from "./HouseholdRemoveMember.page";

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
  removeHouseholdMember: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
const sessionMock = vi.mocked(hasRegisteredSession);
const membershipMock = vi.mocked(getHouseholdMembership);
const inviteMock = vi.mocked(getHouseholdInvite);
const pageMock = vi.mocked(getHouseholdMembersPage);
const removeMock = vi.mocked(removeHouseholdMember);

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

describe("HouseholdRemoveMemberDialog", () => {
  const createProps = (overrides: Partial<HouseholdRemoveMemberDialogProps> = {}): HouseholdRemoveMemberDialogProps => ({
    errorMessage: null,
    isDialogOpen: true,
    isRemoving: false,
    memberLabel: "Beto",
    onRemoveCancel: vi.fn(),
    onRemoveConfirm: vi.fn(),
    ...overrides,
  });

  it("asks for confirmation with the approved texts and the name of the person (CA-02)", () => {
    render(<HouseholdRemoveMemberDialog {...createProps()} />);
    const page = createHouseholdRemoveMemberPage();

    expect(page.getDialog()).toHaveTextContent("Beto");
    expect(page.getDialog()).toHaveTextContent(HOUSEHOLD_REMOVE_MEMBER_TEXT.DIALOG_MESSAGE);
    expect(page.getCancelButton()).toBeEnabled();
    expect(page.getConfirmButton()).toBeEnabled();
  });

  it("calls onRemoveConfirm and onRemoveCancel", async () => {
    const props = createProps();
    render(<HouseholdRemoveMemberDialog {...props} />);
    const page = createHouseholdRemoveMemberPage();

    await page.confirm();
    await page.cancel();
    await page.pressEscape();

    expect(props.onRemoveConfirm).toHaveBeenCalledTimes(1);
    // "Cancelar" y Escape (comportamiento del Modal).
    expect(props.onRemoveCancel).toHaveBeenCalledTimes(2);
  });

  it("shows the error as an alert inside the dialog", () => {
    render(<HouseholdRemoveMemberDialog {...createProps({ errorMessage: HOUSEHOLD_REMOVE_MEMBER_TEXT.ERROR })} />);
    const page = createHouseholdRemoveMemberPage();

    expect(page.getDialogError()).toHaveTextContent(HOUSEHOLD_REMOVE_MEMBER_TEXT.ERROR);
  });

  it("disables both buttons while removing", () => {
    render(<HouseholdRemoveMemberDialog {...createProps({ isRemoving: true })} />);
    const page = createHouseholdRemoveMemberPage();

    expect(page.getConfirmButton()).toBeDisabled();
    expect(page.getCancelButton()).toBeDisabled();
  });

  it("renders nothing while closed", () => {
    render(<HouseholdRemoveMemberDialog {...createProps({ isDialogOpen: false, memberLabel: null })} />);
    const page = createHouseholdRemoveMemberPage();

    expect(page.queryDialog()).not.toBeInTheDocument();
  });
});

describe("HouseholdMembersSection: remove buttons", () => {
  const createProps = (overrides: Partial<HouseholdMembersSectionProps> = {}): HouseholdMembersSectionProps => ({
    countText: "2 integrantes",
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
    rows: [
      { initials: "A", isAdmin: true, isCurrentUser: true, label: "Ana", onRemoveRequest: null, rowKey: "row-ana" },
      { initials: "B", isAdmin: false, isCurrentUser: false, label: "Beto", onRemoveRequest: vi.fn(), rowKey: "row-beto" },
    ],
    titleFocusKey: 0,
    ...overrides,
  });

  it("shows «Eliminar integrante» only on rows that have it, named after the person", async () => {
    const props = createProps();
    render(<HouseholdMembersSection {...props} />);
    const page = createHouseholdRemoveMemberPage();

    expect(page.queryRemoveButton("Ana")).not.toBeInTheDocument();
    expect(page.getRemoveButton("Beto")).toHaveTextContent(HOUSEHOLD_REMOVE_MEMBER_TEXT.ACTION);
    await page.requestRemoval("Beto");

    expect(props.rows[1].onRemoveRequest).toHaveBeenCalledTimes(1);
  });

  it("moves the focus to the section title when asked (the removed row is gone)", () => {
    const { rerender } = render(<HouseholdMembersSection {...createProps()} />);
    const page = createHouseholdRemoveMemberPage();

    rerender(<HouseholdMembersSection {...createProps({ titleFocusKey: 1 })} />);

    expect(page.getSectionTitle()).toHaveFocus();
  });
});

describe("Household: removing a member", () => {
  // Ids inventados (no son de la base). Ana es quien mira.
  const ANA: HouseholdMember = { displayName: "Ana", isCurrentUser: true, role: HOUSEHOLD_ROLE.ADMIN, userId: "user-ana-01" };
  const BETO: HouseholdMember = {
    displayName: "Beto",
    isCurrentUser: false,
    role: HOUSEHOLD_ROLE.MEMBER,
    userId: "user-beto-02",
  };
  const UNNAMED: HouseholdMember = {
    displayName: null,
    isCurrentUser: false,
    role: HOUSEHOLD_ROLE.MEMBER,
    userId: "user-unnamed-03",
  };
  const WITH_BETO = { hasMore: false, members: [ANA, BETO, UNNAMED] };
  const WITHOUT_BETO = { hasMore: false, members: [ANA, UNNAMED] };

  beforeEach(() => {
    vi.resetAllMocks();
    sessionMock.mockResolvedValue(true);
    inviteMock.mockResolvedValue(null);
    membershipMock.mockResolvedValue({ householdName: "Familia Alpízar", role: HOUSEHOLD_ROLE.ADMIN });
    pageMock.mockResolvedValue(WITH_BETO);
  });

  it("shows «Eliminar integrante» to the admin on every row except their own (CA-01)", async () => {
    const { container } = render(<Household />);
    const page = createHouseholdRemoveMemberPage();

    expect(await page.findRemoveButton("Beto")).toBeInTheDocument();
    expect(page.getRemoveButton(HOUSEHOLD_LEAVE_TEXT.UNNAMED_MEMBER)).toBeInTheDocument();
    expect(page.queryRemoveButton("Ana")).not.toBeInTheDocument();
    expect(page.queryAllRemoveButtons()).toHaveLength(2);
    // El id de cada persona queda en el closure: nunca en el HTML.
    expect(container.innerHTML).not.toContain(BETO.userId);
    expect(container.innerHTML).not.toContain(UNNAMED.userId);
  });

  // Regresión: la fila propia nunca tiene el botón, aunque la lista diga que
  // quien mira es `member` (lista cargada justo antes de que le pasaran el rol).
  // Así el rol no la excluye y solo queda la regla "nunca en la fila propia".
  it("never shows «Eliminar integrante» on the admin's own row, even with a stale role (CA-01)", async () => {
    pageMock.mockResolvedValue({
      hasMore: false,
      members: [{ ...ANA, role: HOUSEHOLD_ROLE.MEMBER }, BETO, UNNAMED],
    });
    render(<Household />);
    const page = createHouseholdRemoveMemberPage();

    expect(await page.findRemoveButton("Beto")).toBeInTheDocument();
    expect(page.queryRemoveButton("Ana")).not.toBeInTheDocument();
    expect(page.queryAllRemoveButtons()).toHaveLength(2);
  });

  // La base nunca elimina a un admin; la interfaz tampoco ofrece hacerlo, aunque
  // la lista mostrara a otro admin (por diseño hay uno solo).
  it("never shows «Eliminar integrante» on another admin's row (CA-01)", async () => {
    pageMock.mockResolvedValue({
      hasMore: false,
      members: [ANA, { ...BETO, role: HOUSEHOLD_ROLE.ADMIN }, UNNAMED],
    });
    render(<Household />);
    const page = createHouseholdRemoveMemberPage();

    expect(await page.findRemoveButton(HOUSEHOLD_LEAVE_TEXT.UNNAMED_MEMBER)).toBeInTheDocument();
    expect(page.queryRemoveButton("Beto")).not.toBeInTheDocument();
    expect(page.queryAllRemoveButtons()).toHaveLength(1);
  });

  it("does not show «Eliminar integrante» to a member (CA-01)", async () => {
    membershipMock.mockResolvedValue({ householdName: "Familia Alpízar", role: HOUSEHOLD_ROLE.MEMBER });
    render(<Household />);
    const page = createHouseholdRemoveMemberPage();

    expect(await page.findRow("Beto")).toBeInTheDocument();
    expect(page.queryAllRemoveButtons()).toHaveLength(0);
  });

  it("cancels without calling the database (CA-02)", async () => {
    render(<Household />);
    const page = createHouseholdRemoveMemberPage();

    await page.requestRemoval("Beto");
    expect(page.getDialog()).toHaveTextContent("Beto");
    await page.cancel();

    expect(page.queryDialog()).not.toBeInTheDocument();
    expect(removeMock).not.toHaveBeenCalled();
    expect(page.queryRow("Beto")).toBeInTheDocument();
  });

  it("removes the member, announces it, reloads the list and keeps the focus stable (CA-03, CA-04)", async () => {
    removeMock.mockResolvedValue(HOUSEHOLD_REMOVE_MEMBER_RESULT.REMOVED);
    render(<Household />);
    const page = createHouseholdRemoveMemberPage();
    await page.requestRemoval("Beto");
    pageMock.mockResolvedValue(WITHOUT_BETO);

    await page.confirm();

    expect(removeMock).toHaveBeenCalledWith(BETO.userId);
    expect(await page.findNotice(HOUSEHOLD_REMOVE_MEMBER_TEXT.SUCCESS)).toBeInTheDocument();
    expect(page.queryDialog()).not.toBeInTheDocument();
    await waitFor(() => expect(page.queryRow("Beto")).not.toBeInTheDocument());
    expect(pageMock).toHaveBeenCalledTimes(2);
    expect(page.getSectionTitle()).toHaveFocus();
  });

  it("does not close with Escape while removing (SPEC §9)", async () => {
    let resolveRemoval: (value: typeof HOUSEHOLD_REMOVE_MEMBER_RESULT.REMOVED) => void = () => undefined;
    removeMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRemoval = resolve;
      }),
    );
    render(<Household />);
    const page = createHouseholdRemoveMemberPage();
    await page.requestRemoval("Beto");

    await page.confirm();
    await page.pressEscape();

    expect(page.getDialog()).toBeInTheDocument();
    expect(page.getConfirmButton()).toBeDisabled();

    resolveRemoval(HOUSEHOLD_REMOVE_MEMBER_RESULT.REMOVED);
    expect(await page.findNotice(HOUSEHOLD_REMOVE_MEMBER_TEXT.SUCCESS)).toBeInTheDocument();
  });

  it("keeps the dialog open with the error and retries (SPEC §7)", async () => {
    removeMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(HOUSEHOLD_REMOVE_MEMBER_RESULT.REMOVED);
    render(<Household />);
    const page = createHouseholdRemoveMemberPage();
    await page.requestRemoval("Beto");

    await page.confirm();

    expect(await page.findDialogError()).toHaveTextContent(HOUSEHOLD_REMOVE_MEMBER_TEXT.ERROR);
    expect(page.getDialog()).toHaveTextContent("Beto");

    await page.confirm();

    expect(await page.findNotice(HOUSEHOLD_REMOVE_MEMBER_TEXT.SUCCESS)).toBeInTheDocument();
    expect(removeMock).toHaveBeenCalledTimes(2);
  });

  it("closes and reloads the list without a message when the member was already gone", async () => {
    removeMock.mockResolvedValue(HOUSEHOLD_REMOVE_MEMBER_RESULT.MEMBER_NOT_FOUND);
    render(<Household />);
    const page = createHouseholdRemoveMemberPage();
    await page.requestRemoval("Beto");
    pageMock.mockResolvedValue(WITHOUT_BETO);

    await page.confirm();

    await waitFor(() => expect(page.queryRow("Beto")).not.toBeInTheDocument());
    expect(page.queryDialog()).not.toBeInTheDocument();
    expect(page.queryNotice(HOUSEHOLD_REMOVE_MEMBER_TEXT.SUCCESS)).not.toBeInTheDocument();
  });

  it("reads the membership again when the caller is no longer the admin", async () => {
    removeMock.mockResolvedValue(HOUSEHOLD_REMOVE_MEMBER_RESULT.NOT_ADMIN);
    render(<Household />);
    const page = createHouseholdRemoveMemberPage();
    await page.requestRemoval("Beto");
    // Pasó el rol en otra pestaña: ahora es miembro.
    membershipMock.mockResolvedValue({ householdName: "Familia Alpízar", role: HOUSEHOLD_ROLE.MEMBER });

    await page.confirm();

    await waitFor(() => expect(page.queryAllRemoveButtons()).toHaveLength(0));
    expect(membershipMock).toHaveBeenCalledTimes(2);
    expect(page.queryDialog()).not.toBeInTheDocument();
    expect(screen.queryByText(HOUSEHOLD_REMOVE_MEMBER_TEXT.SUCCESS)).not.toBeInTheDocument();
  });
});
