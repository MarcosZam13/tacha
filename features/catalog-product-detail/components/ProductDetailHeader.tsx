import Image from "next/image";
import type { ProductDetailHeaderProps } from "./models/ProductDetailHeaderProps.interface";

/**
 * Cabecera del detalle (SPEC.md §8): foto grande, nombre y tamaño. Mismo
 * marcador con inicial que CatalogCard cuando no hay foto (SPEC.md §5.5),
 * y mismo `alt`/`aria-hidden` que esa tarjeta (SPEC.md §9).
 */
export const ProductDetailHeader = ({
  imageUrl,
  placeholderInitial,
  productName,
  sizeLabel,
}: ProductDetailHeaderProps): React.JSX.Element => (
  <header className="flex flex-col gap-3">
    {imageUrl ? (
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-tacha-card">
        <Image src={imageUrl} alt={productName} fill unoptimized className="object-cover" />
      </div>
    ) : (
      <div
        aria-hidden="true"
        className="flex aspect-[4/3] w-full items-center justify-center rounded-tacha-card bg-tacha-chipbg font-display text-7xl text-tacha-teal"
      >
        {placeholderInitial}
      </div>
    )}

    <div>
      <h1 className="font-display text-3xl font-bold text-tacha-text">{productName}</h1>
      <p className="font-body text-sm text-tacha-textsec">{sizeLabel}</p>
    </div>
  </header>
);
