import { screen } from "@testing-library/react";

/**
 * Page Object de la tarjeta de catálogo: cómo encontrar su título, precio y
 * badge. Sin aserciones: las hace el test.
 */
export const createCatalogCardPage = () => {
  const getTitle = (title: string) => screen.getByRole("heading", { name: title });
  const queryBadge = (label: string) => screen.queryByText(label);
  const getImage = (title: string) => screen.getByRole("img", { name: title });

  return { getImage, getTitle, queryBadge };
};
