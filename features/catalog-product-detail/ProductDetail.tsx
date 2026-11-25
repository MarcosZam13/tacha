"use client";

import { Button, Spinner } from "@/components/ui";
import { PriceDisclaimer } from "@/components/price-disclaimer/PriceDisclaimer";
import { BUTTON_VARIANT } from "@/constants";
import { PRODUCT_DETAIL_STATUS, PRODUCT_DETAIL_TEXT } from "./constants/catalog-product-detail.constants";
import { AddToListControl } from "./components/AddToListControl";
import { ProductDetailBrands } from "./components/ProductDetailBrands";
import { ProductDetailHeader } from "./components/ProductDetailHeader";
import { ProductDetailReferencePrice } from "./components/ProductDetailReferencePrice";
import { ProductDetailStorePrices } from "./components/ProductDetailStorePrices";
import { useProductDetailViewModel } from "./hooks/useProductDetailViewModel";
import type { ProductDetailProps } from "./models/ProductDetailProps.interface";

/**
 * Pantalla de detalle de un producto del catálogo (SCRUM-85, HU-53). "use
 * client" porque usa hooks y habla con Supabase desde el navegador. Entrada
 * delgada: toda la lógica vive en useProductDetailViewModel.
 */
export const ProductDetail = ({ variantId }: ProductDetailProps): React.JSX.Element => {
  const viewModel = useProductDetailViewModel(variantId);

  if (viewModel.status === PRODUCT_DETAIL_STATUS.LOADING) {
    return (
      <div className="mx-auto flex w-full max-w-3xl justify-center px-4 py-8">
        <Spinner />
      </div>
    );
  }

  if (viewModel.status === PRODUCT_DETAIL_STATUS.ERROR) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-3 px-4 py-8">
        <p role="alert" className="font-body text-sm text-red-600">
          {viewModel.errorMessage}
        </p>
        {viewModel.isNotFound ? null : (
          <Button variant={BUTTON_VARIANT.SECONDARY} onClick={viewModel.onRetry}>
            {PRODUCT_DETAIL_TEXT.RETRY}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <ProductDetailHeader
        imageUrl={viewModel.imageUrl}
        placeholderInitial={viewModel.placeholderInitial}
        productName={viewModel.productName}
        sizeLabel={viewModel.sizeLabel}
      />

      <ProductDetailBrands brands={viewModel.brands} />

      {viewModel.hasReferencePrice ? (
        <ProductDetailReferencePrice
          priceLabel={viewModel.referencePriceLabel}
          storeName={viewModel.referenceStoreName}
        />
      ) : null}

      <ProductDetailStorePrices storePriceRows={viewModel.storePriceRows} />
      <PriceDisclaimer />

      {viewModel.addToListBlockedMessage !== null ? (
        <p role="note" className="rounded-tacha-card border border-tacha-border bg-tacha-surface p-4 font-body text-sm text-tacha-textsec">
          {viewModel.addToListBlockedMessage}
        </p>
      ) : (
        <AddToListControl
          addErrorMessage={viewModel.addErrorMessage}
          canDecreaseQuantity={viewModel.canDecreaseQuantity}
          isAdding={viewModel.status === PRODUCT_DETAIL_STATUS.ADDING}
          onAddToList={viewModel.onAddToList}
          onDecreaseQuantity={viewModel.onDecreaseQuantity}
          onIncreaseQuantity={viewModel.onIncreaseQuantity}
          quantity={viewModel.quantity}
          wasJustAdded={viewModel.wasJustAdded}
        />
      )}
    </div>
  );
};
