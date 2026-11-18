import { useId } from "react";
import { Button, Checkbox, Input, Modal } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import {
  CREATE_PRODUCT_FORM_TEXT,
  CREATE_PRODUCT_FORM_UNIT_OPTIONS,
  REFERENCE_STORE_CHOICE,
  REFERENCE_STORE_SUPERMARKET_OPTIONS,
} from "@/constants/create-product-form.constants";
import type { CreateProductFormProps } from "./models/CreateProductFormProps.interface";

/**
 * Formulario "Agregar producto personalizado" (SCRUM-87 / HU-56), compartido
 * desde el día 1 (CA-04) entre el botón de "Mis productos"
 * (features/my-products/MyProducts.tsx) y el enlace de "sin resultados" en
 * "Buscar" (features/catalog/components/CatalogEmptyState.tsx, vía
 * CatalogSearch.tsx) — cada pantalla con su propia instancia de
 * useCreateProductForm (plan.md), nunca estado compartido entre las dos.
 *
 * Solo presentación: todo el estado, la validación y la carga de categorías
 * ya vienen calculados en las props. La unidad usa un <select> nativo, mismo
 * criterio que RecipeIngredientRow (features/recipes/components): todavía no
 * hay un segundo consumidor real de un Select compartido fuera de ese caso.
 * El error de categoría va fuera del <label> y ligado por aria-describedby
 * (mismo criterio que Input, SCRUM-137): dentro, el lector de pantalla lo
 * anunciaría como parte del nombre del campo.
 *
 * HU-57 (SCRUM-88): tienda y precio de referencia, los dos opcionales. La
 * tienda es un <select> nativo (Sin tienda / los 3 súper / Otra tienda) y
 * "Otra tienda" muestra un campo de texto para escribirla.
 */
export const CreateProductForm = ({
  baseUnit,
  brandName,
  canSubmit,
  categories,
  categoriesErrorMessage,
  categoryError,
  categoryId,
  errorMessage,
  isCategoriesLoading,
  isOpen,
  isSubmitting,
  name,
  nameError,
  onBaseUnitChange,
  onBrandNameChange,
  onCancel,
  onCategoryChange,
  onNameChange,
  onPriceChange,
  onQuantityChange,
  onShareWithHouseholdChange,
  onStoreChoiceChange,
  onStoreNameChange,
  onSubmit,
  price,
  priceError,
  quantity,
  quantityError,
  shareWithHousehold,
  showShareCheckbox,
  showStoreNameInput,
  storeChoice,
  storeName,
  storeNameError,
}: CreateProductFormProps): React.JSX.Element => {
  const categorySelectId = useId();
  const categoryDescriptionId = `${categorySelectId}-descripcion`;
  const unitSelectId = useId();
  const storeSelectId = useId();
  const categoryDescription = categoryError ?? categoriesErrorMessage;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={CREATE_PRODUCT_FORM_TEXT.TITLE}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label={CREATE_PRODUCT_FORM_TEXT.NAME_LABEL}
          value={name}
          onChange={onNameChange}
          errorMessage={nameError}
          isRequired
        />

        <Input label={CREATE_PRODUCT_FORM_TEXT.BRAND_LABEL} value={brandName} onChange={onBrandNameChange} />

        <div className="flex flex-col gap-1 font-body text-sm">
          <label htmlFor={categorySelectId} className="font-medium text-tacha-text">
            {CREATE_PRODUCT_FORM_TEXT.CATEGORY_LABEL}
            <span className="text-tacha-terracotta"> *</span>
          </label>
          <select
            id={categorySelectId}
            value={categoryId}
            onChange={(event) => onCategoryChange(event.target.value)}
            disabled={isCategoriesLoading}
            aria-invalid={categoryError ? true : undefined}
            aria-describedby={categoryDescription ? categoryDescriptionId : undefined}
            className="rounded-tacha-badge border border-tacha-border bg-tacha-surface px-3 py-2 text-tacha-text outline-none focus:ring-2 focus:ring-tacha-teal"
          >
            <option value="">{CREATE_PRODUCT_FORM_TEXT.CATEGORY_PLACEHOLDER}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {categoryDescription ? (
            <p id={categoryDescriptionId} role="alert" className="text-red-600">
              {categoryDescription}
            </p>
          ) : null}
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              label={CREATE_PRODUCT_FORM_TEXT.QUANTITY_LABEL}
              value={quantity}
              onChange={onQuantityChange}
              type="number"
              errorMessage={quantityError}
              isRequired
            />
          </div>
          <div className="flex w-28 flex-col gap-1 font-body text-sm">
            <label htmlFor={unitSelectId} className="font-medium text-tacha-text">
              {CREATE_PRODUCT_FORM_TEXT.UNIT_LABEL}
            </label>
            <select
              id={unitSelectId}
              value={baseUnit}
              // Los valores salen de CREATE_PRODUCT_FORM_UNIT_OPTIONS, así que siempre es una unidad válida.
              onChange={(event) => onBaseUnitChange(event.target.value as typeof baseUnit)}
              className="rounded-tacha-badge border border-tacha-border bg-tacha-surface px-3 py-2 text-tacha-text outline-none focus:ring-2 focus:ring-tacha-teal"
            >
              {CREATE_PRODUCT_FORM_UNIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1 font-body text-sm">
          <label htmlFor={storeSelectId} className="font-medium text-tacha-text">
            {CREATE_PRODUCT_FORM_TEXT.STORE_LABEL}
          </label>
          <select
            id={storeSelectId}
            value={storeChoice}
            // Los valores salen de REFERENCE_STORE_CHOICE y de los slugs de las opciones, así que siempre es válido.
            onChange={(event) => onStoreChoiceChange(event.target.value as typeof storeChoice)}
            className="rounded-tacha-badge border border-tacha-border bg-tacha-surface px-3 py-2 text-tacha-text outline-none focus:ring-2 focus:ring-tacha-teal"
          >
            <option value={REFERENCE_STORE_CHOICE.NONE}>{CREATE_PRODUCT_FORM_TEXT.STORE_NONE_OPTION}</option>
            {REFERENCE_STORE_SUPERMARKET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value={REFERENCE_STORE_CHOICE.CUSTOM}>{CREATE_PRODUCT_FORM_TEXT.STORE_CUSTOM_OPTION}</option>
          </select>
        </div>

        {showStoreNameInput ? (
          <Input
            label={CREATE_PRODUCT_FORM_TEXT.STORE_NAME_LABEL}
            value={storeName}
            onChange={onStoreNameChange}
            errorMessage={storeNameError}
            isRequired
          />
        ) : null}

        <Input
          label={CREATE_PRODUCT_FORM_TEXT.PRICE_LABEL}
          value={price}
          onChange={onPriceChange}
          type="number"
          errorMessage={priceError}
        />

        {showShareCheckbox ? (
          <Checkbox
            isChecked={shareWithHousehold}
            onChange={onShareWithHouseholdChange}
            label={CREATE_PRODUCT_FORM_TEXT.SHARE_LABEL}
          />
        ) : null}

        {errorMessage ? (
          <p role="alert" className="font-body text-sm text-red-600">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onCancel} isDisabled={isSubmitting}>
            {CREATE_PRODUCT_FORM_TEXT.CANCEL}
          </Button>
          <Button type="submit" isDisabled={!canSubmit || isSubmitting}>
            {isSubmitting ? CREATE_PRODUCT_FORM_TEXT.SAVING : CREATE_PRODUCT_FORM_TEXT.SAVE}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
