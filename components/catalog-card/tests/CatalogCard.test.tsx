// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
