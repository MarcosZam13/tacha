// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { APP_ROUTE, CATALOG_TAB } from "@/constants";
import { CatalogTabs } from "../CatalogTabs";
import { createCatalogTabsPage } from "./CatalogTabs.page";

afterEach(cleanup);

describe("CatalogTabs", () => {
  it("links the two tabs to their screens", () => {
    render(<CatalogTabs activeTab={CATALOG_TAB.SEARCH} />);
    const page = createCatalogTabsPage();

    expect(page.getSearchTab()).toHaveAttribute("href", APP_ROUTE.CATALOG);
    expect(page.getMyProductsTab()).toHaveAttribute("href", APP_ROUTE.CATALOG_MY_PRODUCTS);
  });

  it("marks the search tab as the current page and not my products", () => {
    render(<CatalogTabs activeTab={CATALOG_TAB.SEARCH} />);
    const page = createCatalogTabsPage();

    expect(page.getSearchTab()).toHaveAttribute("aria-current", "page");
    expect(page.getMyProductsTab()).not.toHaveAttribute("aria-current");
  });

  it("marks my products tab as the current page and not search", () => {
    render(<CatalogTabs activeTab={CATALOG_TAB.MY_PRODUCTS} />);
    const page = createCatalogTabsPage();

    expect(page.getMyProductsTab()).toHaveAttribute("aria-current", "page");
    expect(page.getSearchTab()).not.toHaveAttribute("aria-current");
  });

  it("names the navigation for the screen reader", () => {
    render(<CatalogTabs activeTab={CATALOG_TAB.SEARCH} />);
    const page = createCatalogTabsPage();

    expect(page.getNavigation()).toBeInTheDocument();
  });
});
