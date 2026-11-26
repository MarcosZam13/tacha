"use client";

import { Button, Spinner } from "@/components/ui";
import { CatalogCard } from "@/components/catalog-card/CatalogCard";
import { CatalogTabs } from "@/components/catalog-tabs/CatalogTabs";
import { CreateProductForm } from "@/components/create-product-form/CreateProductForm";
import { PriceDisclaimer } from "@/components/price-disclaimer/PriceDisclaimer";
import { CATALOG_TAB, CATALOG_TABS_TEXT } from "@/constants";
import { CREATE_PRODUCT_FORM_TEXT } from "@/constants/create-product-form.constants";
import { useCreateProductForm } from "@/hooks/useCreateProductForm";
import { MyProductCardActions } from "./components/MyProductCardActions";
import { MyProductDeleteDialog } from "./components/MyProductDeleteDialog";
import { MyProductsEmptyState } from "./components/MyProductsEmptyState";
import { MY_PRODUCTS_STATUS, MY_PRODUCTS_TEXT } from "./constants/my-products.constants";
import { useMyProductsViewModel } from "./hooks/useMyProductsViewModel";

/**
 * Sub-tab "Mis productos" de la sección Catálogo (SCRUM-86 / HU-55).
 * "use client" porque usa hooks y habla con Supabase desde el navegador.
 *
 * HU-56 (SCRUM-87): botón "+ Agregar producto" en la cabecera, junto al
 * título (SPEC.md §8) — abre su propia instancia de CreateProductForm;
 * al crear con éxito, refresca el listado (viewModel.reload()) para que el
 * producto nuevo se vea de inmediato, sin recargar la página.
 *
 * HU-58 (SCRUM-89): cada tarjeta lleva "Editar" (abre el mismo formulario,
 * precargado) y "Eliminar" (abre el diálogo de confirmación).
 */
export const MyProducts = (): React.JSX.Element => {
  const viewModel = useMyProductsViewModel();
  const createProductForm = useCreateProductForm(() => viewModel.reload());

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:mx-0 md:px-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-tacha-text">
          {CATALOG_TABS_TEXT.SECTION_TITLE}
        </h1>
        <Button onClick={createProductForm.onOpen}>{CREATE_PRODUCT_FORM_TEXT.OPEN_BUTTON}</Button>
      </div>
      <CatalogTabs activeTab={CATALOG_TAB.MY_PRODUCTS} />

      {viewModel.status === MY_PRODUCTS_STATUS.LOADING ? (
        <Spinner label={MY_PRODUCTS_TEXT.LOADING} />
      ) : null}
      {viewModel.status === MY_PRODUCTS_STATUS.ERROR ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {viewModel.errorMessage}
        </p>
      ) : null}
      {viewModel.status === MY_PRODUCTS_STATUS.EMPTY ? <MyProductsEmptyState /> : null}
      {viewModel.status === MY_PRODUCTS_STATUS.READY ? (
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {viewModel.items.map(({ card, product }) => (
            <CatalogCard
              key={card.id}
              card={card}
              actions={
                <MyProductCardActions
                  productName={product.name}
                  onEdit={() => createProductForm.onOpenEdit(product)}
                  onDelete={() => viewModel.deletion.onDeleteRequest(product)}
                />
              }
            />
          ))}
        </ul>
      ) : null}

      {/* SCRUM-75: una sola vez, debajo de las tarjetas, siempre visible. */}
      <PriceDisclaimer />

      <CreateProductForm {...createProductForm} />
      <MyProductDeleteDialog {...viewModel.deletion} />
    </div>
  );
};
