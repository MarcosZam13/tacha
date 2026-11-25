import { RECIPE_AUDIENCE, RECIPE_AUDIENCE_FIELD_NAME, RECIPE_AUDIENCE_TEXT } from "../constants/recipes.constants";
import type { RecipeAudienceFieldProps } from "./models/RecipeAudienceFieldProps.interface";

const AUDIENCE_OPTIONS = [
  { label: RECIPE_AUDIENCE_TEXT.PERSONAL, value: RECIPE_AUDIENCE.PERSONAL },
  { label: RECIPE_AUDIENCE_TEXT.FAMILY, value: RECIPE_AUDIENCE.FAMILY },
] as const;

/**
 * "¿Para quién es?". Sin familia no dibuja nada; en una receta de la familia solo
 * lo dice, porque compartir no se deshace (SPEC reglas 52 y 53). Solo presentación.
 */
export const RecipeAudienceField = ({
  audience,
  canChoose,
  isSaving,
  isShared,
  onAudienceChange,
}: RecipeAudienceFieldProps): React.JSX.Element | null => {
  if (isShared) {
    return <p className="font-body text-sm text-tacha-textsec">{RECIPE_AUDIENCE_TEXT.FIXED}</p>;
  }
  if (!canChoose) return null;

  return (
    <fieldset disabled={isSaving} className="flex min-w-0 flex-col gap-2 font-body text-sm text-tacha-text">
      <legend className="mb-1 font-medium">{RECIPE_AUDIENCE_TEXT.LEGEND}</legend>
      {AUDIENCE_OPTIONS.map(({ label, value }) => (
        <label key={value} className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={RECIPE_AUDIENCE_FIELD_NAME}
            value={value}
            checked={audience === value}
            onChange={() => onAudienceChange(value)}
          />
          {label}
        </label>
      ))}
      {audience === RECIPE_AUDIENCE.FAMILY ? (
        <p className="text-tacha-textsec">{RECIPE_AUDIENCE_TEXT.HELP}</p>
      ) : null}
    </fieldset>
  );
};
