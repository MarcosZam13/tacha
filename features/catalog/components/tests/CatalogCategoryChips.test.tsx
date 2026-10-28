// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Category } from "@/types/catalog.types";
import { CATALOG_CATEGORY_CHIPS_TEXT } from "../../constants/catalog-search.constants";
import { CatalogCategoryChips } from "../CatalogCategoryChips";
import { createCatalogCategoryChipsPage } from "./CatalogCategoryChips.page";

afterEach(cleanup);

const ALL_LABEL = CATALOG_CATEGORY_CHIPS_TEXT.ALL_CATEGORIES_LABEL;

const CATEGORIES: Category[] = [
  { id: "category-1", name: "Lácteos" },
  { id: "category-2", name: "Postres" },
];

describe("CatalogCategoryChips", () => {
  it('shows a "Todas" chip plus one per category (CA-01)', () => {
    render(<CatalogCategoryChips activeCategoryId={null} categories={CATEGORIES} onCategoryChange={vi.fn()} />);
    const page = createCatalogCategoryChipsPage();

    expect(page.getChip(ALL_LABEL)).toBeInTheDocument();
    expect(page.getChip("Lácteos")).toBeInTheDocument();
    expect(page.getChip("Postres")).toBeInTheDocument();
  });

  it("marks only the active category as pressed (CA-02)", () => {
    render(
      <CatalogCategoryChips activeCategoryId="category-1" categories={CATEGORIES} onCategoryChange={vi.fn()} />,
    );
    const page = createCatalogCategoryChipsPage();

    expect(page.getChip("Lácteos")).toHaveAttribute("aria-pressed", "true");
    expect(page.getChip("Postres")).toHaveAttribute("aria-pressed", "false");
    expect(page.getChip(ALL_LABEL)).toHaveAttribute("aria-pressed", "false");
  });

  it('never marks "Todas" as pressed, even with no active category', () => {
    render(<CatalogCategoryChips activeCategoryId={null} categories={CATEGORIES} onCategoryChange={vi.fn()} />);
    const page = createCatalogCategoryChipsPage();

    expect(page.getChip(ALL_LABEL)).toHaveAttribute("aria-pressed", "false");
  });

  it("activates a category when touching its chip", async () => {
    const onCategoryChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CatalogCategoryChips activeCategoryId={null} categories={CATEGORIES} onCategoryChange={onCategoryChange} />,
    );
    const page = createCatalogCategoryChipsPage();

    await user.click(page.getChip("Postres"));

    expect(onCategoryChange).toHaveBeenCalledWith("category-2");
  });

  it("clears the filter when touching the already active category (CA-02)", async () => {
    const onCategoryChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CatalogCategoryChips
        activeCategoryId="category-1"
        categories={CATEGORIES}
        onCategoryChange={onCategoryChange}
      />,
    );
    const page = createCatalogCategoryChipsPage();

    await user.click(page.getChip("Lácteos"));

    expect(onCategoryChange).toHaveBeenCalledWith(null);
  });

  it('clears the filter when touching "Todas" with a category active (CA-02)', async () => {
    const onCategoryChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CatalogCategoryChips
        activeCategoryId="category-1"
        categories={CATEGORIES}
        onCategoryChange={onCategoryChange}
      />,
    );
    const page = createCatalogCategoryChipsPage();

    await user.click(page.getChip(ALL_LABEL));

    expect(onCategoryChange).toHaveBeenCalledWith(null);
  });

  it("names the group for the screen reader", () => {
    render(<CatalogCategoryChips activeCategoryId={null} categories={CATEGORIES} onCategoryChange={vi.fn()} />);
    const page = createCatalogCategoryChipsPage();

    expect(page.getGroup(CATALOG_CATEGORY_CHIPS_TEXT.ARIA_LABEL)).toBeInTheDocument();
  });
});
