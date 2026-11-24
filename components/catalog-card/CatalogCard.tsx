import { Info } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui";
import { CATALOG_PRODUCT_DETAIL_ROUTE, ICON_SIZE, REFERENCE_PRICE_TEXT } from "@/constants";
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
 *
 * HU-58 (SCRUM-89): `actions` opcional, debajo y fuera del link (composición:
 * la tarjeta no sabe qué botones son ni qué hacen).
 *
 * HU-57 (SCRUM-88): un precio de referencia del usuario lleva el ícono "i" y
 * el aviso de CA-02. La tarjeta entera es un link, así que el ícono no puede
 * ser un botón: el aviso va como texto para lector de pantalla y como title
 * (al pasar el mouse); el detalle del producto lo muestra completo y visible.
 */
export const CatalogCard = ({ actions, card }: CatalogCardProps): React.JSX.Element => (
  <li className="flex flex-col gap-2">
    <Link href={CATALOG_PRODUCT_DETAIL_ROUTE(card.id)} className="block flex-1">
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
          {card.storeName ? <p className="font-body text-xs text-tacha-textsec">{card.storeName}</p> : null}
          {/* mt-auto: el precio queda al pie aunque los títulos ocupen distinto. */}
          <p
            className="mt-auto flex items-center gap-1 font-body text-sm text-tacha-terracotta"
            title={card.isReferencePrice ? REFERENCE_PRICE_TEXT.INFO : undefined}
          >
            {card.priceLabel}
            {card.isReferencePrice ? (
              <>
                <Icon icon={Info} size={ICON_SIZE.SMALL} />
                <span className="sr-only">{REFERENCE_PRICE_TEXT.INFO}</span>
              </>
            ) : null}
          </p>
        </div>
      </article>
    </Link>
    {actions}
  </li>
);
