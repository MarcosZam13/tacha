// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { REFERENCE_PRICE_TEXT } from "@/constants";
import type { CatalogCardData } from "@/types/catalog.types";
import { CatalogCard } from "../CatalogCard";
import { createCatalogCardPage } from "./CatalogCard.page";

afterEach(cleanup);

const CARD: CatalogCardData = {
  id: "variant-1",
  imageUrl: null,
  placeholderInitial: "L",
  priceLabel: "₡800 – ₡1 200",
  title: "Leche — 1000 ml",
};

describe("CatalogCard", () => {
  // HU-58 (SCRUM-89): las acciones van debajo de la tarjeta, nunca dentro del link.
  it("renders the actions outside the card link", () => {
    render(
      <ul>
        <CatalogCard card={CARD} actions={<button type="button">Editar</button>} />
      </ul>,
    );
    const page = createCatalogCardPage();

    expect(page.getActionButton("Editar")).toBeInTheDocument();
    expect(page.getLink().contains(page.getActionButton("Editar"))).toBe(false);
  });

  // HU-57 CA-02: el precio de referencia lleva el aviso de que lo ingresó el usuario.
  it("marks a reference price as entered by the user and shows its store", () => {
    render(
      <ul>
        <CatalogCard
          card={{ ...CARD, isReferencePrice: true, priceLabel: "₡3 200", storeName: "Carnicería Los Ángeles" }}
        />
      </ul>,
    );
    const page = createCatalogCardPage();

    expect(page.queryPrice("₡3 200")).toBeInTheDocument();
    expect(page.queryText(REFERENCE_PRICE_TEXT.INFO)).toBeInTheDocument();
    expect(page.queryText("Carnicería Los Ángeles")).toBeInTheDocument();
  });

  it("does not show the reference price notice for a scraped price", () => {
    render(
      <ul>
        <CatalogCard card={CARD} />
      </ul>,
    );
    const page = createCatalogCardPage();

    expect(page.queryText(REFERENCE_PRICE_TEXT.INFO)).not.toBeInTheDocument();
  });

  it("shows the title and price", () => {
    render(
      <ul>
        <CatalogCard card={CARD} />
      </ul>,
    );
    const page = createCatalogCardPage();

    expect(page.getTitle(CARD.title)).toBeInTheDocument();
    expect(page.queryBadge(CARD.priceLabel)).toBeInTheDocument();
  });

  it("does not show a badge when badgeLabel is not set", () => {
    render(
      <ul>
        <CatalogCard card={CARD} />
      </ul>,
    );
    const page = createCatalogCardPage();

    expect(page.queryBadge("Agregado por mí")).not.toBeInTheDocument();
  });

  it("shows the badge when badgeLabel is set", () => {
    render(
      <ul>
        <CatalogCard card={{ ...CARD, badgeLabel: "Agregado por mí" }} />
      </ul>,
    );
    const page = createCatalogCardPage();

    expect(page.queryBadge("Agregado por mí")).toBeInTheDocument();
  });
});
