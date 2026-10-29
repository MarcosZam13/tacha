import { Button, Checkbox, Input, Modal } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import {
  CREATE_PRODUCT_FORM_TEXT,
  CREATE_PRODUCT_FORM_UNIT_OPTIONS,
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
  onQuantityChange,
  onShareWithHouseholdChange,
  onSubmit,
  quantity,
  quantityError,
  shareWithHousehold,
  showShareCheckbox,
}: CreateProductFormProps): React.JSX.Element => (
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

      <label className="flex flex-col gap-1 font-body text-sm">
        <span className="font-medium text-tacha-text">
          {CREATE_PRODUCT_FORM_TEXT.CATEGORY_LABEL}
          <span className="text-tacha-terracotta"> *</span>
        </span>
        <select
          value={categoryId}
          onChange={(event) => onCategoryChange(event.target.value)}
          disabled={isCategoriesLoading}
          className="rounded-tacha-badge border border-tacha-border bg-tacha-surface px-3 py-2 text-tacha-text outline-none focus:ring-2 focus:ring-tacha-teal"
        >
          <option value="">{CREATE_PRODUCT_FORM_TEXT.CATEGORY_PLACEHOLDER}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {categoryError ? (
          <p role="alert" className="text-red-600">
            {categoryError}
          </p>
        ) : null}
        {categoriesErrorMessage ? (
          <p role="alert" className="text-red-600">
            {categoriesErrorMessage}
          </p>
        ) : null}
      </label>

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
        <label className="flex w-28 flex-col gap-1 font-body text-sm">
          <span className="font-medium text-tacha-text">{CREATE_PRODUCT_FORM_TEXT.UNIT_LABEL}</span>
          <select
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
        </label>
      </div>

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
