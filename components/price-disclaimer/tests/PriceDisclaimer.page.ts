import { screen, within } from "@testing-library/react";
import { PRICE_DISCLAIMER_TEXT } from "@/constants";

/**
 * Page Object del aviso de precios estimados (SCRUM-75), solo o dentro de una
 * pantalla. Sin aserciones: las hace el test.
 */
export const createPriceDisclaimerPage = () => {
  // El <aside> tiene el rol "complementary" y su nombre es el título.
  const getDisclaimer = () => screen.getByRole("complementary", { name: PRICE_DISCLAIMER_TEXT.TITLE });
  const queryAllDisclaimers = () => screen.queryAllByRole("complementary", { name: PRICE_DISCLAIMER_TEXT.TITLE });
  const queryAlertsInside = () => within(getDisclaimer()).queryAllByRole("alert");
  const queryStatusInside = () => within(getDisclaimer()).queryAllByRole("status");
  const queryButtonsInside = () => within(getDisclaimer()).queryAllByRole("button");

  return { getDisclaimer, queryAlertsInside, queryAllDisclaimers, queryButtonsInside, queryStatusInside };
};
