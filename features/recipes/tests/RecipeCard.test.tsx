// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecipeCard } from "../components/RecipeCard";
import type { RecipeCardProps } from "../components/models/RecipeCardProps.interface";
import type { RecipeSummary } from "../models/recipe-catalog.interfaces";
import { createRecipeCardPage } from "./RecipeCard.page";

const createRecipe = (overrides: Partial<RecipeSummary> = {}): RecipeSummary => ({
  editPath: "/recetas/flan/editar",
  hasIngredients: true,
  id: "flan",
  mainIngredients: [{ id: "milk", name: "Leche" }],
  moreIngredientsLabel: "+2 más",
  name: "Flan",
  photoUrl: "https://fotos/flan",
  placeholderInitial: "F",
  servingsLabel: "4 porciones",
  ...overrides,
});

const createProps = (recipe: RecipeSummary): RecipeCardProps => ({
  addToList: { feedback: null, isAdding: false, isDisabled: false },
  coverage: { ingredients: [], messageText: null, panelId: "panel-flan", panelStatus: null, summaryText: null },
  onAddToListRequest: vi.fn(),
  onCoverageRetry: vi.fn(),
  onCoverageToggle: vi.fn(),
  onDeleteRequest: vi.fn(),
  recipe,
});

const renderCard = (overrides: Partial<RecipeSummary> = {}) => {
  const props = createProps(createRecipe(overrides));
  const { rerender } = render(<RecipeCard {...props} />);
  return { page: createRecipeCardPage(), props, rerender };
};

afterEach(cleanup);

describe("RecipeCard", () => {
  it("shows the photo with the name of the recipe, the servings and the ingredients", () => {
    const { page } = renderCard();

    expect(page.getPhoto("Flan")).toHaveAttribute("src", "https://fotos/flan");
    expect(page.getText("4 porciones")).toBeInTheDocument();
    expect(page.getText("Leche")).toBeInTheDocument();
    expect(page.getText("+2 más")).toBeInTheDocument();
    expect(page.getEditLink()).toHaveAttribute("href", "/recetas/flan/editar");
  });

  it("shows the initial without a photo", () => {
    const { page } = renderCard({ photoUrl: null });

    expect(page.queryPhoto()).not.toBeInTheDocument();
    expect(page.getText("F")).toBeInTheDocument();
  });

  it("shows the initial when the photo does not load, and tries again with another link", () => {
    const { page, props, rerender } = renderCard();

    page.breakPhoto("Flan");
    expect(page.queryPhoto()).not.toBeInTheDocument();
    expect(page.getText("F")).toBeInTheDocument();

    rerender(<RecipeCard {...props} recipe={createRecipe({ photoUrl: "https://fotos/otra" })} />);
    expect(page.getPhoto("Flan")).toHaveAttribute("src", "https://fotos/otra");
  });

  it("asks to delete this recipe", async () => {
    const { page, props } = renderCard();

    await page.requestDelete("Flan");

    expect(props.onDeleteRequest).toHaveBeenCalledWith(props.recipe);
  });

  it("cannot be added to the list without ingredients", () => {
    const { page } = renderCard({ hasIngredients: false, mainIngredients: [], moreIngredientsLabel: null });

    expect(page.queryAddButton()).not.toBeInTheDocument();
  });
});
