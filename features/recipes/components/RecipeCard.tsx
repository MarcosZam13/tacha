import Image from "next/image";
import Link from "next/link";
import { CategoryLabel, Chip } from "@/components/ui";
import { RECIPE_TEXT } from "../constants/recipes.constants";
import type { RecipeCardProps } from "./models/RecipeCardProps.interface";

/**
 * Tarjeta de una receta. Solo presentación: los textos ("4 porciones",
 * "+1 más", la inicial) ya vienen armados desde utils/toRecipeSummary.ts.
 *
 * La foto usa next/image con `unoptimized`: sirve cualquier URL sin
 * configurar dominios en next.config.ts (el lugar de las fotos se decide en
 * SCRUM-95, cuando se puedan subir).
 */
export const RecipeCard = ({ recipe }: RecipeCardProps): React.JSX.Element => (
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

        {/* mt-auto: el link queda al pie aunque las tarjetas tengan alturas distintas. */}
        <Link
          href={recipe.editPath}
          className="mt-auto self-start font-body text-sm font-semibold text-tacha-teal hover:underline"
        >
          {RECIPE_TEXT.EDIT}
        </Link>
      </div>
    </article>
  </li>
);
