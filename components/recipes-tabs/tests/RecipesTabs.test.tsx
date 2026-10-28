// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { APP_ROUTE, RECIPES_TAB } from "@/constants";
import { RecipesTabs } from "../RecipesTabs";
import { createRecipesTabsPage } from "./RecipesTabs.page";

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

describe("RecipesTabs", () => {
  it("links the two tabs to their screens", () => {
    render(<RecipesTabs activeTab={RECIPES_TAB.RECIPES} />);
    const page = createRecipesTabsPage();

    expect(page.getRecipesTab()).toHaveAttribute("href", APP_ROUTE.RECIPES);
    expect(page.getPlannerTab()).toHaveAttribute("href", APP_ROUTE.MEAL_PLANNER);
  });

  it("marks the recipes tab as the current page and not the planner", () => {
    render(<RecipesTabs activeTab={RECIPES_TAB.RECIPES} />);
    const page = createRecipesTabsPage();

    expect(page.getRecipesTab()).toHaveAttribute("aria-current", "page");
    expect(page.getPlannerTab()).not.toHaveAttribute("aria-current");
  });

  it("marks the planner tab as the current page and not the recipes", () => {
    render(<RecipesTabs activeTab={RECIPES_TAB.PLANNER} />);
    const page = createRecipesTabsPage();

    expect(page.getPlannerTab()).toHaveAttribute("aria-current", "page");
    expect(page.getRecipesTab()).not.toHaveAttribute("aria-current");
  });

  it("does not say the planner is coming soon any more", () => {
    render(<RecipesTabs activeTab={RECIPES_TAB.RECIPES} />);
    const page = createRecipesTabsPage();

    expect(page.queryComingSoon()).not.toBeInTheDocument();
  });

  it("names the navigation for the screen reader", () => {
    render(<RecipesTabs activeTab={RECIPES_TAB.RECIPES} />);
    const page = createRecipesTabsPage();

    expect(page.getNavigation()).toBeInTheDocument();
  });
});
