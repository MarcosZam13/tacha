import Image from "next/image";
import { PRODUCT_DETAIL_TEXT } from "../constants/catalog-product-detail.constants";
import type { ProductDetailBrandsProps } from "./models/ProductDetailBrandsProps.interface";

/**
 * Sección "Marcas disponibles" (SPEC.md §5.3, 5.4, 5.8): solo informativa,
 * nunca afecta qué se agrega a la lista. El logo es una mejora visual cuando
 * el dato existe — hoy ninguna marca lo tiene (SPEC.md §15) — y nunca un
 * requisito para listar la marca: sin logo se muestra solo el nombre.
 */
export const ProductDetailBrands = ({ brands }: ProductDetailBrandsProps): React.JSX.Element => (
  <section>
    <h2 className="font-body text-sm font-semibold text-tacha-text">{PRODUCT_DETAIL_TEXT.BRANDS_TITLE}</h2>

    {brands.length > 0 ? (
      <ul className="mt-2 flex flex-wrap gap-3">
        {brands.map((brand) => (
          <li
            key={brand.name}
            className="flex items-center gap-2 rounded-tacha-badge border border-tacha-border bg-tacha-surface px-3 py-2"
          >
            {brand.logoUrl ? (
              <Image src={brand.logoUrl} alt={brand.name} width={20} height={20} unoptimized />
            ) : null}
            <span className="font-body text-sm text-tacha-text">{brand.name}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-2 font-body text-sm text-tacha-textsec">{PRODUCT_DETAIL_TEXT.NO_BRANDS}</p>
    )}
  </section>
);
