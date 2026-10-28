// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecipeDeleteDialog } from "../components/RecipeDeleteDialog";
import type { RecipeDeleteDialogProps } from "../components/models/RecipeDeleteDialogProps.type";
import { createRecipeDeleteDialogPage } from "./RecipeDeleteDialog.page";

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

const createProps = (overrides: Partial<RecipeDeleteDialogProps> = {}): RecipeDeleteDialogProps => ({
  errorMessage: null,
  isDeleting: false,
  isDialogOpen: true,
  mealPlanNotice: null,
  onDeleteCancel: vi.fn(),
  onDeleteConfirm: vi.fn(),
  recipeName: "Tres leches",
  ...overrides,
});

describe("RecipeDeleteDialog", () => {
  it("names the recipe that is about to be deleted", () => {
    render(<RecipeDeleteDialog {...createProps()} />);
    const page = createRecipeDeleteDialogPage();

    expect(page.getDialog()).toBeInTheDocument();
    expect(page.getRecipeName("Tres leches")).toBeInTheDocument();
  });

  it("warns how many slots of the plan will be left empty", () => {
    render(<RecipeDeleteDialog {...createProps({ mealPlanNotice: "Está en 2 espacios de tu plan; quedarán vacíos." })} />);
    const page = createRecipeDeleteDialogPage();

    expect(page.getMealPlanNotice()).toHaveTextContent("Está en 2 espacios de tu plan; quedarán vacíos.");
  });

  it("says nothing about the plan when the recipe is not in it", () => {
    render(<RecipeDeleteDialog {...createProps({ mealPlanNotice: null })} />);
    const page = createRecipeDeleteDialogPage();

    expect(page.queryMealPlanNotice()).not.toBeInTheDocument();
  });

  it("still lets the user delete when there is a plan notice", () => {
    render(<RecipeDeleteDialog {...createProps({ mealPlanNotice: "Está en 1 espacio de tu plan; quedará vacío." })} />);
    const page = createRecipeDeleteDialogPage();

    expect(page.getDeleteButton()).toBeEnabled();
  });
});
