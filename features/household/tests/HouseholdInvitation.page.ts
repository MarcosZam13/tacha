import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HOUSEHOLD_JOIN_TEXT } from "../constants/household.constants";

/**
 * Page Object de HouseholdInvitation: cómo encontrar y usar lo que ve el
 * usuario. Sin expect: las aserciones son de cada test (unit-testing-standards §3).
 */
export const createHouseholdInvitationPage = () => {
  const user = userEvent.setup();

  const findJoinButton = () => screen.findByRole("button", { name: HOUSEHOLD_JOIN_TEXT.JOIN });
  const queryJoinButton = () => screen.queryByRole("button", { name: HOUSEHOLD_JOIN_TEXT.JOIN });
  const findLoginLink = () => screen.findByRole("link", { name: HOUSEHOLD_JOIN_TEXT.LOGIN });
  const findHouseholdLink = () => screen.findByRole("link", { name: HOUSEHOLD_JOIN_TEXT.GO_TO_HOUSEHOLD });
  const findAlert = () => screen.findByRole("alert");
  const getPageText = () => document.body.textContent ?? "";

  const join = async () => {
    await user.click(await findJoinButton());
  };

  return { findAlert, findHouseholdLink, findJoinButton, findLoginLink, getPageText, join, queryJoinButton };
};
