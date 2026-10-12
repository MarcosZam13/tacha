// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Household } from "../Household";
import { HouseholdLeaveDialog } from "../components/HouseholdLeaveDialog";
import type { HouseholdLeaveDialogProps } from "../components/models/HouseholdLeaveDialogProps.interface";
import { HOUSEHOLD_LEAVE_RESULT, HOUSEHOLD_LEAVE_TEXT, HOUSEHOLD_ROLE } from "../constants/household.constants";
import {
  getHouseholdInvite,
  getHouseholdMembers,
  getHouseholdMembership,
  hasRegisteredSession,
  leaveHousehold,
} from "../services/household.service";
import { createHouseholdLeavePage } from "./HouseholdLeave.page";

// La pantalla completa con el servicio falso: sin Supabase ni sesión real.
// El diálogo solo no usa el servicio; el mock no lo afecta.
vi.mock("../services/household.service", () => ({
  acceptHouseholdInvite: vi.fn(),
  createHousehold: vi.fn(),
  createHouseholdInvite: vi.fn(),
  getHouseholdInvite: vi.fn(),
  getHouseholdMembers: vi.fn(),
  getHouseholdMembership: vi.fn(),
  hasRegisteredSession: vi.fn(),
  leaveHousehold: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
const sessionMock = vi.mocked(hasRegisteredSession);
const membershipMock = vi.mocked(getHouseholdMembership);
const inviteMock = vi.mocked(getHouseholdInvite);
const membersMock = vi.mocked(getHouseholdMembers);
const leaveMock = vi.mocked(leaveHousehold);

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

const HOUSEHOLD_NAME = "Familia Alpízar";

describe("HouseholdLeaveDialog", () => {
  // Ids inventados: solo sirven de key, no deben llegar al HTML.
  const BETO_ID = "a1b2c3d4-0000-4000-8000-000000000002";
  const UNNAMED_ID = "a1b2c3d4-0000-4000-8000-000000000003";

  const createProps = (overrides: Partial<HouseholdLeaveDialogProps> = {}): HouseholdLeaveDialogProps => ({
    description: HOUSEHOLD_LEAVE_TEXT.MEMBER_DESCRIPTION,
    errorMessage: null,
    isConfirmDisabled: false,
    isDialogOpen: true,
    isLeaving: false,
    isLoadingMembers: false,
    newAdminOptions: [],
    onLeaveCancel: vi.fn(),
    onLeaveConfirm: vi.fn(),
    showConfirm: true,
    title: `¿Salir de ${HOUSEHOLD_NAME}?`,
    ...overrides,
  });

  const createTransferOptions = (onSelectBeto = vi.fn()) => [
    { isSelected: false, label: "Beto", onSelect: onSelectBeto, optionKey: BETO_ID },
    { isSelected: false, label: HOUSEHOLD_LEAVE_TEXT.UNNAMED_MEMBER, onSelect: vi.fn(), optionKey: UNNAMED_ID },
  ];

  it("names the family in the title and explains what leaving means for a member", () => {
    render(<HouseholdLeaveDialog {...createProps()} />);
    const page = createHouseholdLeavePage();

    expect(page.getDialog()).toHaveAccessibleName(`¿Salir de ${HOUSEHOLD_NAME}?`);
    expect(page.getDialog()).toHaveTextContent(HOUSEHOLD_LEAVE_TEXT.MEMBER_DESCRIPTION);
    expect(page.queryNewAdminGroup()).not.toBeInTheDocument();
  });

  it("confirms only when Salir is pressed", async () => {
    const onLeaveConfirm = vi.fn();
    render(<HouseholdLeaveDialog {...createProps({ onLeaveConfirm })} />);
    const page = createHouseholdLeavePage();

    await userEvent.click(page.getConfirmButton());

    expect(onLeaveConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders nothing while closed", () => {
    render(<HouseholdLeaveDialog {...createProps({ isDialogOpen: false })} />);
    const page = createHouseholdLeavePage();

    expect(page.queryDialog()).not.toBeInTheDocument();
  });

  it("cancels with the Cancelar button", async () => {
    const onLeaveCancel = vi.fn();
    render(<HouseholdLeaveDialog {...createProps({ onLeaveCancel })} />);
    const page = createHouseholdLeavePage();

    await userEvent.click(page.getCancelButton());

    expect(onLeaveCancel).toHaveBeenCalledTimes(1);
  });

  it("cancels with Escape", async () => {
    const onLeaveCancel = vi.fn();
    render(<HouseholdLeaveDialog {...createProps({ onLeaveCancel })} />);
    const page = createHouseholdLeavePage();

    await page.pressEscape();

    expect(onLeaveCancel).toHaveBeenCalledTimes(1);
  });

  it("warns the sole admin that the family and its link are deleted", () => {
    render(<HouseholdLeaveDialog {...createProps({ description: HOUSEHOLD_LEAVE_TEXT.SOLE_ADMIN_DESCRIPTION })} />);
    const page = createHouseholdLeavePage();

    expect(page.getDialog()).toHaveTextContent(HOUSEHOLD_LEAVE_TEXT.SOLE_ADMIN_DESCRIPTION);
    expect(page.getNewAdminOptions()).toHaveLength(0);
  });

  // El admin con otros miembros: las props que arma el ViewModel antes de elegir.
  const renderTransferDialog = (onSelectBeto = vi.fn()) =>
    render(
      <HouseholdLeaveDialog
        {...createProps({
          description: HOUSEHOLD_LEAVE_TEXT.TRANSFER_DESCRIPTION,
          isConfirmDisabled: true,
          newAdminOptions: createTransferOptions(onSelectBeto),
        })}
      />,
    );

  it("lists the members as labelled radios inside the legend group, without ids in the page", () => {
    renderTransferDialog();
    const page = createHouseholdLeavePage();

    expect(page.getNewAdminGroup()).toBeInTheDocument();
    expect(page.getNewAdminOption("Beto")).not.toBeChecked();
    expect(page.getNewAdminOption(HOUSEHOLD_LEAVE_TEXT.UNNAMED_MEMBER)).toBeInTheDocument();
    // Sin elegir no se puede salir.
    expect(page.getConfirmButton()).toBeDisabled();
    expect(document.body.innerHTML).not.toContain(BETO_ID);
    expect(document.body.innerHTML).not.toContain(UNNAMED_ID);
  });

  it("reports the chosen member when a radio is selected", async () => {
    const onSelectBeto = vi.fn();
    renderTransferDialog(onSelectBeto);
    const page = createHouseholdLeavePage();

    await userEvent.click(page.getNewAdminOption("Beto"));

    expect(onSelectBeto).toHaveBeenCalledTimes(1);
  });

  it("disables everything and shows Saliendo… while leaving", () => {
    render(
      <HouseholdLeaveDialog
        {...createProps({ isConfirmDisabled: true, isLeaving: true, newAdminOptions: createTransferOptions() })}
      />,
    );
    const page = createHouseholdLeavePage();

    expect(page.getLeavingButton()).toBeDisabled();
    expect(page.getCancelButton()).toBeDisabled();
    expect(page.getNewAdminOption("Beto")).toBeDisabled();
  });

  it("shows a spinner and only Cancelar while the members load", () => {
    render(<HouseholdLeaveDialog {...createProps({ isLoadingMembers: true, showConfirm: false })} />);
    const page = createHouseholdLeavePage();

    expect(page.getDialogLoading()).toBeInTheDocument();
    expect(page.queryConfirmButton()).not.toBeInTheDocument();
    expect(page.getCancelButton()).toBeEnabled();
  });

  it("announces errors as an alert", () => {
    render(
      <HouseholdLeaveDialog
        {...createProps({ errorMessage: HOUSEHOLD_LEAVE_TEXT.MEMBERS_LOAD_ERROR, showConfirm: false })}
      />,
    );
    const page = createHouseholdLeavePage();

    expect(page.getDialogError()).toHaveTextContent(HOUSEHOLD_LEAVE_TEXT.MEMBERS_LOAD_ERROR);
    expect(page.queryConfirmButton()).not.toBeInTheDocument();
  });
});

describe("Household: leaving the family", () => {
  // Ids inventados (no son de la base).
  const ADMIN_MEMBER = { displayName: "Ana", isCurrentUser: true, role: HOUSEHOLD_ROLE.ADMIN, userId: "user-ana" };
  const BETO = { displayName: "Beto", isCurrentUser: false, role: HOUSEHOLD_ROLE.MEMBER, userId: "user-beto" };
  const UNNAMED = { displayName: null, isCurrentUser: false, role: HOUSEHOLD_ROLE.MEMBER, userId: "user-unnamed" };

  beforeEach(() => {
    vi.resetAllMocks();
    sessionMock.mockResolvedValue(true);
    inviteMock.mockResolvedValue(null);
  });

  it("lets a member leave and shows the no-family screen with a notice", async () => {
    // Primero miembro; después de salir, la base ya no tiene membresía.
    membershipMock
      .mockResolvedValueOnce({ householdName: HOUSEHOLD_NAME, role: HOUSEHOLD_ROLE.MEMBER })
      .mockResolvedValueOnce(null);
    leaveMock.mockResolvedValue(HOUSEHOLD_LEAVE_RESULT.LEFT);
    render(<Household />);
    const page = createHouseholdLeavePage();

    await userEvent.click(await page.findLeaveButton());
    expect(page.getDialog()).toHaveAccessibleName(`¿Salir de ${HOUSEHOLD_NAME}?`);
    // Abrir no llama a la base: hace falta confirmar (CA-01).
    expect(leaveMock).not.toHaveBeenCalled();
    expect(membersMock).not.toHaveBeenCalled();

    await userEvent.click(page.getConfirmButton());

    expect(await page.findNotice(HOUSEHOLD_LEAVE_TEXT.LEFT)).toBeInTheDocument();
    expect(await page.findCreateTitle()).toBeInTheDocument();
    expect(page.queryDialog()).not.toBeInTheDocument();
    expect(page.queryLeaveButton()).not.toBeInTheDocument();
    expect(leaveMock).toHaveBeenCalledWith(undefined);
  });

  it("keeps the member in the family when they cancel", async () => {
    membershipMock.mockResolvedValue({ householdName: HOUSEHOLD_NAME, role: HOUSEHOLD_ROLE.MEMBER });
    render(<Household />);
    const page = createHouseholdLeavePage();

    await userEvent.click(await page.findLeaveButton());
    await userEvent.click(page.getCancelButton());

    expect(page.queryDialog()).not.toBeInTheDocument();
    expect(page.getLeaveHeading()).toBeInTheDocument();
    expect(leaveMock).not.toHaveBeenCalled();
  });

  it("makes the admin choose the new admin, showing names or the unnamed text", async () => {
    membershipMock
      .mockResolvedValueOnce({ householdName: HOUSEHOLD_NAME, role: HOUSEHOLD_ROLE.ADMIN })
      .mockResolvedValueOnce(null);
    membersMock.mockResolvedValue([ADMIN_MEMBER, BETO, UNNAMED]);
    leaveMock.mockResolvedValue(HOUSEHOLD_LEAVE_RESULT.LEFT);
    render(<Household />);
    const page = createHouseholdLeavePage();

    await userEvent.click(await page.findLeaveButton());

    expect(await page.findNewAdminOption("Beto")).toBeInTheDocument();
    expect(page.getNewAdminOption(HOUSEHOLD_LEAVE_TEXT.UNNAMED_MEMBER)).toBeInTheDocument();
    // El admin que sale no aparece entre las opciones.
    expect(page.getNewAdminOptions()).toHaveLength(2);
    expect(page.getConfirmButton()).toBeDisabled();

    await userEvent.click(page.getNewAdminOption("Beto"));
    expect(page.getNewAdminOption("Beto")).toBeChecked();
    await userEvent.click(page.getConfirmButton());

    expect(await page.findNotice(HOUSEHOLD_LEAVE_TEXT.LEFT)).toBeInTheDocument();
    expect(leaveMock).toHaveBeenCalledWith(BETO.userId);
  });

  it("deletes the family when the sole admin leaves", async () => {
    membershipMock
      .mockResolvedValueOnce({ householdName: HOUSEHOLD_NAME, role: HOUSEHOLD_ROLE.ADMIN })
      .mockResolvedValueOnce(null);
    membersMock.mockResolvedValue([ADMIN_MEMBER]);
    leaveMock.mockResolvedValue(HOUSEHOLD_LEAVE_RESULT.HOUSEHOLD_DELETED);
    render(<Household />);
    const page = createHouseholdLeavePage();

    await userEvent.click(await page.findLeaveButton());
    expect(await page.findDialogText(HOUSEHOLD_LEAVE_TEXT.SOLE_ADMIN_DESCRIPTION)).toBeInTheDocument();
    await userEvent.click(page.getConfirmButton());

    expect(await page.findNotice(HOUSEHOLD_LEAVE_TEXT.HOUSEHOLD_DELETED)).toBeInTheDocument();
    expect(await page.findCreateTitle()).toBeInTheDocument();
  });

  it("shows the real state without a success notice on not_member", async () => {
    // Ya había salido (por ejemplo, en otra pestaña): la base responde not_member.
    membershipMock
      .mockResolvedValueOnce({ householdName: HOUSEHOLD_NAME, role: HOUSEHOLD_ROLE.MEMBER })
      .mockResolvedValueOnce(null);
    leaveMock.mockResolvedValue(HOUSEHOLD_LEAVE_RESULT.NOT_MEMBER);
    render(<Household />);
    const page = createHouseholdLeavePage();

    await userEvent.click(await page.findLeaveButton());
    await userEvent.click(page.getConfirmButton());

    expect(await page.findCreateTitle()).toBeInTheDocument();
    expect(page.queryDialog()).not.toBeInTheDocument();
    expect(page.queryNotice(HOUSEHOLD_LEAVE_TEXT.LEFT)).not.toBeInTheDocument();
    expect(page.queryNotice(HOUSEHOLD_LEAVE_TEXT.HOUSEHOLD_DELETED)).not.toBeInTheDocument();
  });

  it("keeps the dialog open with the error when leaving fails, and stays in the family", async () => {
    membershipMock.mockResolvedValue({ householdName: HOUSEHOLD_NAME, role: HOUSEHOLD_ROLE.MEMBER });
    leaveMock.mockRejectedValue(new Error("network"));
    render(<Household />);
    const page = createHouseholdLeavePage();

    await userEvent.click(await page.findLeaveButton());
    await userEvent.click(page.getConfirmButton());

    expect(await page.findDialogError()).toHaveTextContent(HOUSEHOLD_LEAVE_TEXT.FAILED);
    // "Salir" sigue disponible para reintentar y la pantalla no cambió.
    expect(page.getConfirmButton()).toBeEnabled();
    expect(page.getLeaveHeading()).toBeInTheDocument();
    expect(page.queryNotice(HOUSEHOLD_LEAVE_TEXT.LEFT)).not.toBeInTheDocument();
  });

  it("does not offer leaving without a family", async () => {
    membershipMock.mockResolvedValue(null);
    render(<Household />);
    const page = createHouseholdLeavePage();

    expect(await page.findCreateTitle()).toBeInTheDocument();
    expect(page.queryLeaveButton()).not.toBeInTheDocument();
  });
});
