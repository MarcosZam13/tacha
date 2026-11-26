"use client";

import Link from "next/link";
import { ProductSearch } from "@/components/product-search/ProductSearch";
import { CategoryLabel, Checkbox, Input } from "@/components/ui";
import { APP_ROUTE } from "@/constants";
import { ProductGroupEditorActions } from "./components/ProductGroupEditorActions";
import { ProductGroupItemRow } from "./components/ProductGroupItemRow";
import { PRODUCT_GROUP_EDITOR_TEXT } from "./constants/product-group-editor.constants";
import { useProductGroupEditorViewModel } from "./hooks/useProductGroupEditorViewModel";

/**
 * Crear un grupo de productos (SCRUM-110 / HU-73): nombre, buscador, filas
 * compactas, compartir y guardar. "use client" porque usa hooks y habla con
 * Supabase desde el navegador.
 */
export const ProductGroupEditor = (): React.JSX.Element => {
  const viewModel = useProductGroupEditorViewModel();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:mx-0 md:px-10">
      <Link href={APP_ROUTE.LIST_GROUPS} className="self-start font-body text-sm text-tacha-teal hover:underline">
        {PRODUCT_GROUP_EDITOR_TEXT.BACK_TO_GROUPS}
      </Link>
      <h1 className="font-display text-3xl font-bold text-tacha-text">{PRODUCT_GROUP_EDITOR_TEXT.TITLE}</h1>

      {/* noValidate: la validación la hace el ViewModel, con los mismos mensajes que la base. */}
      <form noValidate onSubmit={viewModel.onSubmit} className="flex flex-col gap-6">
        <Input
          label={PRODUCT_GROUP_EDITOR_TEXT.NAME_LABEL}
          value={viewModel.name}
          onChange={viewModel.onNameChange}
          placeholder={PRODUCT_GROUP_EDITOR_TEXT.NAME_PLACEHOLDER}
          errorMessage={viewModel.nameError}
          isRequired
        />

        <section className="flex flex-col gap-3">
          <CategoryLabel>{PRODUCT_GROUP_EDITOR_TEXT.ITEMS_LABEL}</CategoryLabel>
          <p className="font-body text-sm text-tacha-textsec">{PRODUCT_GROUP_EDITOR_TEXT.ITEMS_HINT}</p>

          <ProductSearch {...viewModel.itemSearch} />

          {/* Anuncia lo que pasó con las filas (agregada, sumada, quitada o tope). */}
          <p role="status" className="font-body text-sm text-tacha-textsec">
            {viewModel.announcement}
          </p>
          {viewModel.itemsError ? (
            <p role="alert" className="font-body text-sm text-red-600">
              {viewModel.itemsError}
            </p>
          ) : null}

          {viewModel.items.length > 0 ? (
            <ul className="flex flex-col divide-y divide-tacha-border rounded-tacha-badge border border-tacha-border bg-tacha-surface">
              {viewModel.items.map((item) => (
                <ProductGroupItemRow
                  key={item.variantId}
                  item={item}
                  onDecrease={viewModel.onDecreaseItem}
                  onIncrease={viewModel.onIncreaseItem}
                  onRemove={viewModel.onRemoveItem}
                />
              ))}
            </ul>
          ) : (
            <p className="font-body text-sm text-tacha-textsec">{PRODUCT_GROUP_EDITOR_TEXT.NO_ITEMS}</p>
          )}
        </section>

        {viewModel.showShareCheckbox ? (
          <div className="flex flex-col gap-2">
            <Checkbox
              isChecked={viewModel.shareWithHousehold}
              onChange={viewModel.onShareChange}
              label={PRODUCT_GROUP_EDITOR_TEXT.SHARE_LABEL}
            />
            {viewModel.shareError ? (
              <p role="alert" className="font-body text-sm text-red-600">
                {viewModel.shareError}
              </p>
            ) : null}
          </div>
        ) : null}

        {viewModel.saveErrorMessage ? (
          <p role="alert" className="font-body text-sm text-red-600">
            {viewModel.saveErrorMessage}
          </p>
        ) : null}
        <ProductGroupEditorActions isSaving={viewModel.isSaving} />
      </form>
    </div>
  );
};
