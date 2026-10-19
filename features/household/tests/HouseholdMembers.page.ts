import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HOUSEHOLD_MEMBERS_TEXT } from "../constants/household.constants";

/**
 * Page Object de "Integrantes de la familia" (SCRUM-60), sola o dentro de
 * "Mi familia". Todo se busca dentro de la sección: la pantalla tiene otras
 * zonas role="status" y role="alert". Sin aserciones: las hace el test.
 */
export const createHouseholdMembersPage = () => {
  const user = userEvent.setup();

  const getSection = () => screen.getByRole("region", { name: HOUSEHOLD_MEMBERS_TEXT.TITLE });
  const findSection = () => screen.findByRole("region", { name: HOUSEHOLD_MEMBERS_TEXT.TITLE });
  const querySection = () => screen.queryByRole("region", { name: HOUSEHOLD_MEMBERS_TEXT.TITLE });
  const getSearchInput = () => within(getSection()).getByRole("textbox", { name: HOUSEHOLD_MEMBERS_TEXT.SEARCH_LABEL });
  const getRows = () => within(getSection()).queryAllByRole("listitem");
  const getRow = (label: string) =>
    within(getSection())
      .getAllByRole("listitem")
      .find((row) => within(row).queryByText(label) !== null);
  // La zona role="status" propia de la sección (la del Spinner no tiene aria-live).
  const getStatus = () =>
    within(getSection())
      .getAllByRole("status")
      .find((region) => region.getAttribute("aria-live") === "polite");
  const queryAlert = () => within(getSection()).queryByRole("alert");
  const findAlert = () => within(getSection()).findByRole("alert");
  const getRetryButton = () => within(getSection()).getByRole("button", { name: HOUSEHOLD_MEMBERS_TEXT.RETRY });
  const findRetryButton = () => within(getSection()).findByRole("button", { name: HOUSEHOLD_MEMBERS_TEXT.RETRY });
  const getLoadMoreButton = () =>
    within(getSection()).getByRole("button", { name: HOUSEHOLD_MEMBERS_TEXT.LOAD_MORE });
  const findLoadMoreButton = () =>
    within(getSection()).findByRole("button", { name: HOUSEHOLD_MEMBERS_TEXT.LOAD_MORE });
  const queryLoadMoreButton = () =>
    within(getSection()).queryByRole("button", { name: HOUSEHOLD_MEMBERS_TEXT.LOAD_MORE });
  const getLoadingMoreButton = () =>
    within(getSection()).getByRole("button", { name: HOUSEHOLD_MEMBERS_TEXT.LOADING_MORE });

  const search = async (text: string) => {
    await user.type(getSearchInput(), text);
  };
  const retry = async () => {
    await user.click(getRetryButton());
  };
  const loadMore = async () => {
    await user.click(getLoadMoreButton());
  };

  return {
    findAlert,
    findLoadMoreButton,
    findRetryButton,
    findSection,
    getLoadMoreButton,
    getLoadingMoreButton,
    getRetryButton,
    getRow,
    getRows,
    getSearchInput,
    getSection,
    getStatus,
    loadMore,
    queryAlert,
    queryLoadMoreButton,
    querySection,
    retry,
    search,
  };
};
