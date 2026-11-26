import { useId } from "react";
import { ImagePlus } from "lucide-react";
import { Button, Icon } from "@/components/ui";
import { BUTTON_VARIANT, ICON_SIZE, IMAGE_FILE_ACCEPT } from "@/constants";
import { RECIPE_PHOTO_TEXT } from "../constants/recipes.constants";
import { RecipePhoto } from "./RecipePhoto";
import type { RecipePhotoFieldProps } from "./models/RecipePhotoFieldProps.interface";

/**
 * Foto de la receta: vista previa, elegir o cambiar, y quitar. El selector es un
 * input oculto a la vista (sr-only, sigue en el orden de Tab) y su etiqueta es
 * el botón. Se vacía tras elegir, para poder elegir el mismo archivo otra vez.
 */
export const RecipePhotoField = ({
  alt,
  errorMessage,
  hasPhoto,
  isSaving,
  onPhotoRemove,
  onPhotoSelect,
  photoUrl,
}: RecipePhotoFieldProps): React.JSX.Element => {
  const inputId = useId();
  const descriptionId = `${inputId}-descripcion`;

  return (
    <div role="group" aria-label={RECIPE_PHOTO_TEXT.LABEL} className="flex flex-col gap-2 font-body text-sm">
      <span aria-hidden="true" className="font-medium text-tacha-text">
        {RECIPE_PHOTO_TEXT.LABEL}
      </span>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="w-full overflow-hidden rounded-tacha-card border border-tacha-border sm:w-64">
          <RecipePhoto alt={alt} fallback={<Icon icon={ImagePlus} size={ICON_SIZE.MEDIUM} />} url={photoUrl} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id={inputId}
            type="file"
            accept={IMAGE_FILE_ACCEPT}
            aria-describedby={descriptionId}
            aria-invalid={errorMessage ? true : undefined}
            disabled={isSaving}
            className="peer sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onPhotoSelect(file);
              event.target.value = "";
            }}
          />
          <label
            htmlFor={inputId}
            className="cursor-pointer rounded-tacha-badge border border-tacha-teal px-4 py-2 font-semibold text-tacha-teal hover:bg-tacha-teal/10 peer-focus-visible:ring-2 peer-focus-visible:ring-tacha-teal peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
          >
            {hasPhoto ? RECIPE_PHOTO_TEXT.CHANGE : RECIPE_PHOTO_TEXT.CHOOSE}
          </label>
          {hasPhoto ? (
            <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isSaving} onClick={onPhotoRemove}>
              {RECIPE_PHOTO_TEXT.REMOVE}
            </Button>
          ) : null}
        </div>
      </div>
      <p
        id={descriptionId}
        role={errorMessage ? "alert" : undefined}
        className={errorMessage ? "text-red-600" : "text-tacha-textsec"}
      >
        {errorMessage ?? RECIPE_PHOTO_TEXT.HELP}
      </p>
    </div>
  );
};
