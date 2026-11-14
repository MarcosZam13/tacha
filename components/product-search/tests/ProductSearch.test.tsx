// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PRODUCT_SEARCH, PRODUCT_SEARCH_KEY } from "@/constants";
import { ProductSearch } from "../ProductSearch";
import type { ProductSearchOption } from "../models/ProductSearchOption.interface";
import type { ProductSearchProps } from "../models/ProductSearchProps.interface";
import { createProductSearchPage } from "./ProductSearch.page";

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

const buildOptions = (count: number): ProductSearchOption[] =>
  Array.from({ length: count }, (_, index) => ({ detail: `${index + 1} L`, id: `variante-${index}`, label: `Leche ${index}` }));

const renderSearch = (overrides: Partial<ProductSearchProps> = {}) => {
  const props: ProductSearchProps = {
    errorMessage: null,
    hasNoResults: false,
    isSearching: false,
    onQueryChange: vi.fn(),
    onSelectOption: vi.fn(),
    options: buildOptions(3),
    query: "",
    ...overrides,
  };
  render(<ProductSearch {...props} />);
  return { page: createProductSearchPage(), props };
};

describe("ProductSearch dropdown (SCRUM-149)", () => {
  it("is a closed combobox until the user focuses or types", () => {
    const { page } = renderSearch();

    expect(page.getCombobox()).toHaveAttribute("aria-expanded", "false");
    expect(page.queryListbox()).toBeNull();
  });

  it("opens a listbox with the results while typing, and still reports the text", () => {
    const { page, props } = renderSearch();

    page.type("lec");

    expect(props.onQueryChange).toHaveBeenCalledWith("lec");
    expect(page.getCombobox()).toHaveAttribute("aria-expanded", "true");
    expect(page.getCombobox()).toHaveAttribute("aria-controls", page.queryListbox()?.id);
    expect(page.getOptions()).toHaveLength(3);
  });

  it(`shows at most ${PRODUCT_SEARCH.MAX_VISIBLE_RESULTS} results and a hint to refine when there are more`, () => {
    const { page } = renderSearch({ options: buildOptions(PRODUCT_SEARCH.MAX_VISIBLE_RESULTS + 5) });

    page.type("le");

    expect(page.getOptions()).toHaveLength(PRODUCT_SEARCH.MAX_VISIBLE_RESULTS);
    expect(page.queryMoreResultsHint()).not.toBeNull();
  });

  it("does not show the hint when every result fits", () => {
    const { page } = renderSearch({ options: buildOptions(PRODUCT_SEARCH.MAX_VISIBLE_RESULTS) });

    page.type("le");

    expect(page.queryMoreResultsHint()).toBeNull();
  });

  it("moves the active option with the arrows and adds it with Enter", () => {
    const { page, props } = renderSearch();
    page.type("le");

    page.pressKey(PRODUCT_SEARCH_KEY.ARROW_DOWN);
    page.pressKey(PRODUCT_SEARCH_KEY.ARROW_DOWN);
    page.pressKey(PRODUCT_SEARCH_KEY.ARROW_UP);
    page.pressKey(PRODUCT_SEARCH_KEY.ARROW_DOWN);

    const activeOption = page.getOptions()[1];
    expect(activeOption).toHaveAttribute("aria-selected", "true");
    expect(page.getCombobox()).toHaveAttribute("aria-activedescendant", activeOption.id);

    page.pressKey(PRODUCT_SEARCH_KEY.ENTER);

    expect(props.onSelectOption).toHaveBeenCalledWith("variante-1");
    expect(page.queryListbox()).toBeNull();
  });

  it("stops at the last option instead of wrapping around", () => {
    const { page } = renderSearch();
    page.type("le");

    for (let step = 0; step < 6; step += 1) page.pressKey(PRODUCT_SEARCH_KEY.ARROW_DOWN);

    expect(page.getOptions()[2]).toHaveAttribute("aria-selected", "true");
  });

  it("does nothing on Enter when no option is active", () => {
    const { page, props } = renderSearch();
    page.type("le");

    page.pressKey(PRODUCT_SEARCH_KEY.ENTER);

    expect(props.onSelectOption).not.toHaveBeenCalled();
    expect(page.queryListbox()).not.toBeNull();
  });

  it("closes with Escape and when the field loses focus", () => {
    const { page } = renderSearch();

    page.type("le");
    page.pressKey(PRODUCT_SEARCH_KEY.ESCAPE);
    expect(page.queryListbox()).toBeNull();

    page.type("lec");
    page.blur();
    expect(page.queryListbox()).toBeNull();
  });

  it("adds the clicked option and closes", () => {
    const { page, props } = renderSearch();
    page.type("le");

    fireEvent.click(page.getOptions()[2]);

    expect(props.onSelectOption).toHaveBeenCalledWith("variante-2");
    expect(page.queryListbox()).toBeNull();
  });

  it("keeps showing «no results» inside the panel", () => {
    const { page } = renderSearch({ hasNoResults: true, options: [] });

    page.type("xyz");

    expect(page.getCombobox()).toHaveAttribute("aria-expanded", "true");
    expect(page.getOptions()).toHaveLength(0);
  });
});
