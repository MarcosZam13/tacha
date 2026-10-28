import Image from "next/image";
import Link from "next/link";
import { Button, CategoryLabel, Chip } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import {
  RECIPE_ADD_TO_LIST_TEXT,
  RECIPE_COVERAGE_TEXT,
  RECIPE_DELETE_TEXT,
  RECIPE_TEXT,
} from "../constants/recipes.constants";
import { RecipeAddToListResult } from "./RecipeAddToListResult";
import { RecipeCoveragePanel } from "./RecipeCoveragePanel";
import type { RecipeCardProps } from "./models/RecipeCardProps.interface";

/**
 * Tarjeta de una receta. Solo presentación: los textos ("4 porciones",
 * "+1 más", la inicial) ya vienen armados desde utils/toRecipeSummary.ts.
 *
 * La foto usa next/image con `unoptimized`: sirve cualquier URL sin
 * configurar dominios en next.config.ts (el lugar de las fotos se decide en
 * SCRUM-95, cuando se puedan subir).
 *
 * "Eliminar" solo abre la confirmación (no borra), por eso va en secundario.
 * Lleva el nombre de la receta oculto (sr-only) para el lector de pantalla:
 * hay un "Eliminar" por tarjeta y así se distinguen. Lo mismo con "Agregar
 * receta a lista" y "Ver qué falta", que no aparecen si la receta no tiene
 * ingredientes. "Ver qué falta" abre su panel dentro de la tarjeta.
 */
export const RecipeCard = ({
  addToList,
  coverage,
  onAddToListRequest,
  onCoverageRetry,
  onCoverageToggle,
  onDeleteRequest,
  recipe,
}: RecipeCardProps): React.JSX.Element => {
  // El panel está abierto cuando tiene un estado que dibujar (null = cerrado).
  const isCoverageOpen = coverage.panelStatus !== null;

  return (
    <li>
      <article className="flex h-full flex-col overflow-hidden rounded-tacha-card border border-tacha-border bg-tacha-surface">
        {recipe.imageUrl ? (
          <div className="relative aspect-[4/3]">
            <Image
              src={recipe.imageUrl}
              alt={recipe.name}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="flex aspect-[4/3] items-center justify-center bg-tacha-chipbg font-display text-5xl text-tacha-teal"
          >
            {recipe.placeholderInitial}
          </div>
        )}

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-tacha-text">{recipe.name}</h2>
            <p className="font-body text-sm text-tacha-textsec">{recipe.servingsLabel}</p>
          </div>

          {recipe.hasIngredients ? (
            <section className="flex flex-col gap-2">
              <CategoryLabel>{RECIPE_TEXT.INGREDIENTS_LABEL}</CategoryLabel>
              <ul className="flex flex-wrap gap-2">
                {recipe.mainIngredients.map((ingredient) => (
                  <li key={ingredient.id}>
                    <Chip>{ingredient.name}</Chip>
                  </li>
                ))}
                {recipe.moreIngredientsLabel ? (
                  <li>
                    <Chip>{recipe.moreIngredientsLabel}</Chip>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}

          {/* mt-auto: las acciones quedan al pie aunque las tarjetas tengan alturas distintas. */}
          <div className="mt-auto flex flex-col gap-3">
            {recipe.hasIngredients ? (
              <div className="flex flex-col gap-2">
                <Button isDisabled={addToList.isDisabled} onClick={() => onAddToListRequest(recipe)}>
                  {addToList.isAdding ? RECIPE_ADD_TO_LIST_TEXT.ADDING : RECIPE_ADD_TO_LIST_TEXT.TRIGGER}
                  <span className="sr-only"> {recipe.name}</span>
                </Button>
                {addToList.feedback ? <RecipeAddToListResult feedback={addToList.feedback} /> : null}
                <Button
                  variant={BUTTON_VARIANT.SECONDARY}
                  ariaControls={isCoverageOpen ? coverage.panelId : undefined}
                  ariaExpanded={isCoverageOpen}
                  onClick={() => onCoverageToggle(recipe.id)}
                >
                  {isCoverageOpen ? RECIPE_COVERAGE_TEXT.CLOSE : RECIPE_COVERAGE_TEXT.OPEN}
                  <span className="sr-only"> {recipe.name}</span>
                </Button>
                {isCoverageOpen ? <RecipeCoveragePanel coverage={coverage} onRetry={onCoverageRetry} /> : null}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <Link
                href={recipe.editPath}
                className="font-body text-sm font-semibold text-tacha-teal hover:underline"
              >
                {RECIPE_TEXT.EDIT}
              </Link>
              <Button variant={BUTTON_VARIANT.SECONDARY} onClick={() => onDeleteRequest(recipe)}>
                {RECIPE_DELETE_TEXT.TRIGGER}
                <span className="sr-only"> {recipe.name}</span>
              </Button>
            </div>
          </div>
        </div>
      </article>
    </li>
  );
};
