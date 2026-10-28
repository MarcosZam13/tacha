import Image from "next/image";
import Link from "next/link";
import { CATALOG_PRODUCT_DETAIL_ROUTE } from "@/constants";
import type { CatalogCardProps } from "./models/CatalogCardProps.interface";

/**
 * Tarjeta de una variante del catálogo. Solo presentación: el título
 * ("Leche — 1000 ml"), el precio, la inicial y la etiqueta opcional
 * (`badgeLabel`, ej. "Agregado por mí" en SCRUM-86) ya vienen armados desde
 * utils/toCatalogCards.ts.
 *
 * La foto usa next/image con `unoptimized`, igual que RecipeCard: las URLs
 * vienen del scraping de varias tiendas y configurar cada dominio en
 * next.config.ts sería frágil.
 *
 * Toda la tarjeta lleva a su detalle (SCRUM-85, plan.md §1.4): sin botones
 * propios adentro, envolverla entera en un Link es seguro (nada de <a>
 * anidado). card.id es el variantId: mismo id que usa CATALOG_PRODUCT_DETAIL_ROUTE.
 *
 * Vive en components/ porque lo usan dos features: "Buscar" (features/catalog)
 * y "Mis productos" (features/my-products).
 */
export const CatalogCard = ({ card }: CatalogCardProps): React.JSX.Element => (
  <li>
    <Link href={CATALOG_PRODUCT_DETAIL_ROUTE(card.id)} className="block h-full">
      <article className="relative flex h-full flex-col overflow-hidden rounded-tacha-card border border-tacha-border bg-tacha-surface">
        {card.badgeLabel ? (
          <span className="absolute left-2 top-2 z-10 rounded-tacha-badge bg-tacha-teal px-2 py-1 font-body text-xs font-semibold text-white">
            {card.badgeLabel}
          </span>
        ) : null}

        {card.imageUrl ? (
          <div className="relative aspect-[4/3]">
            <Image src={card.imageUrl} alt={card.title} fill unoptimized className="object-cover" />
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="flex aspect-[4/3] items-center justify-center bg-tacha-chipbg font-display text-5xl text-tacha-teal"
          >
            {card.placeholderInitial}
          </div>
        )}

        <div className="flex flex-1 flex-col gap-1 p-3">
          <h2 className="font-body text-sm font-semibold text-tacha-text">{card.title}</h2>
          {/* mt-auto: el precio queda al pie aunque los títulos ocupen distinto. */}
          <p className="mt-auto font-body text-sm text-tacha-terracotta">{card.priceLabel}</p>
        </div>
      </article>
    </Link>
  </li>
);
