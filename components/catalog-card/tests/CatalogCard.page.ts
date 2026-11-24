import { screen } from "@testing-library/react";

/**
 * Page Object de la tarjeta de catálogo: cómo encontrar su título, precio y
 * badge. Sin aserciones: las hace el test.
 */
export const createCatalogCardPage = () => {
  const getTitle = (title: string) => screen.getByRole("heading", { name: title });
  const queryBadge = (label: string) => screen.queryByText(label);
  const getImage = (title: string) => screen.getByRole("img", { name: title });
  // HU-58: la tarjeta es un link; las acciones van aparte.
  const getLink = () => screen.getByRole("link");
  const getActionButton = (name: string) => screen.getByRole("button", { name });
  // HU-57: el aviso del precio de referencia y la tienda son texto (el ícono es decorativo).
  const queryText = (text: string) => screen.queryByText(text);
  // El precio comparte su <p> con el aviso oculto: se busca como parte del texto.
  // Intl separa los miles con un espacio duro y Testing Library lo normaliza a
  // un espacio normal en el DOM: se normaliza también lo buscado.
  // Sin dígitos pegados antes ni después: "₡3 200" no coincide con "₡13 200".
  const queryPrice = (priceLabel: string) => {
    const escapedLabel = priceLabel.replace(/\s+/g, " ").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return screen.queryByText(new RegExp(`(?<!\\d)${escapedLabel}(?!\\d)`));
  };

  return { getActionButton, getImage, getLink, getTitle, queryBadge, queryPrice, queryText };
};
