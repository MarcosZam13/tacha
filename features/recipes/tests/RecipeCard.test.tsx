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
  isShared: false,
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
  copy: { errorMessage: null, isCopying: false, successMessage: null },
  coverage: { ingredients: [], messageText: null, panelId: "panel-flan", panelStatus: null, summaryText: null },
  onAddToListRequest: vi.fn(),
  onCopyRequest: vi.fn(),
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

  it("says nothing about the family in a personal recipe, and has no copy", () => {
    const { page } = renderCard();

    expect(page.queryText("Familia")).not.toBeInTheDocument();
    expect(page.queryCopyButton("Flan")).not.toBeInTheDocument();
  });

  it("marks a family recipe and lets the user keep a copy", async () => {
    const { page, props } = renderCard({ isShared: true });

    expect(page.getText("Familia")).toBeInTheDocument();
    await page.requestCopy("Flan");

    expect(props.onCopyRequest).toHaveBeenCalledExactlyOnceWith("flan");
  });

  it("announces the result of the copy and blocks the button while copying", () => {
    const { page, props, rerender } = renderCard({ isShared: true });

    rerender(<RecipeCard {...props} copy={{ errorMessage: null, isCopying: true, successMessage: null }} />);
    expect(page.queryCopyButton("Flan")).toBeDisabled();

    rerender(<RecipeCard {...props} copy={{ errorMessage: null, isCopying: false, successMessage: "Lista" }} />);
    expect(page.getStatus()).toHaveTextContent("Lista");

    rerender(<RecipeCard {...props} copy={{ errorMessage: "Falló", isCopying: false, successMessage: null }} />);
    expect(page.getAlert()).toHaveTextContent("Falló");
  });
});
