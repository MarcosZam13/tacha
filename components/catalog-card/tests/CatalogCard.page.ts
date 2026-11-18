import { screen } from "@testing-library/react";

/**
 * Page Object de la tarjeta de catálogo: cómo encontrar su título, precio y
 * badge. Sin aserciones: las hace el test.
 */
export const createCatalogCardPage = () => {
  const getTitle = (title: string) => screen.getByRole("heading", { name: title });
  const queryBadge = (label: string) => screen.queryByText(label);
  const getImage = (title: string) => screen.getByRole("img", { name: title });
  // HU-57: el aviso del precio de referencia y la tienda son texto (el ícono es decorativo).
  const queryText = (text: string) => screen.queryByText(text);
  // El precio comparte su <p> con el aviso oculto: se busca como parte del texto.
  // Intl separa los miles con un espacio duro y Testing Library lo normaliza a
  // un espacio normal en el DOM: se normaliza también lo buscado.
  const queryPrice = (priceLabel: string) => screen.queryByText(priceLabel.replace(/\s+/g, " "), { exact: false });

  return { getImage, getTitle, queryBadge, queryPrice, queryText };
};
