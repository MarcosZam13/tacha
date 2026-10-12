import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HOUSEHOLD_JOIN_TEXT, HOUSEHOLD_LISTS_DECISION_TEXT } from "../constants/household.constants";

// El aviso final vive en la zona role="status" de la pantalla (no la del Spinner).
const STATUS_REGION_SELECTOR = '[role="status"]';

/**
 * Page Object de la pregunta "¿Qué quieres hacer con tu lista actual?"
 * (SCRUM-59), sola o dentro de "Mi familia" y de la página de invitación.
 * Sin aserciones: las hace el test.
 */
export const createPersonalListsDecisionPage = () => {
  const user = userEvent.setup();

  const getQuestion = () => screen.getByRole("region", { name: HOUSEHOLD_LISTS_DECISION_TEXT.QUESTION });
  const findQuestion = () => screen.findByRole("region", { name: HOUSEHOLD_LISTS_DECISION_TEXT.QUESTION });
  const queryQuestion = () => screen.queryByRole("region", { name: HOUSEHOLD_LISTS_DECISION_TEXT.QUESTION });
  const getKeepButton = () => within(getQuestion()).getByRole("button", { name: HOUSEHOLD_LISTS_DECISION_TEXT.KEEP });
  const getShareButton = () =>
    within(getQuestion()).getByRole("button", { name: HOUSEHOLD_LISTS_DECISION_TEXT.SHARE });
  const getError = () => within(getQuestion()).getByRole("alert");
  const findNotice = (notice: string) => screen.findByText(notice, { selector: STATUS_REGION_SELECTOR });
  const findJoinButton = () => screen.findByRole("button", { name: HOUSEHOLD_JOIN_TEXT.JOIN });

  const keep = async () => {
    await user.click(getKeepButton());
  };
  const share = async () => {
    await user.click(getShareButton());
  };
  const join = async () => {
    await user.click(await findJoinButton());
  };

  return {
    findNotice,
    findQuestion,
    getError,
    getKeepButton,
    getQuestion,
    getShareButton,
    join,
    keep,
    queryQuestion,
    share,
  };
};
