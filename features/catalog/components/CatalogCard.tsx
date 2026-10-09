import Image from "next/image";
import type { CatalogCardProps } from "./models/CatalogCardProps.interface";

/**
 * Tarjeta de una variante del catálogo. Solo presentación: el título
 * ("Leche — 1000 ml"), el precio y la inicial ya vienen armados desde
 * utils/toCatalogCards.ts.
 *
 * La foto usa next/image con `unoptimized`, igual que RecipeCard: las URLs
 * vienen del scraping de varias tiendas y configurar cada dominio en
 * next.config.ts sería frágil.
 */
export const CatalogCard = ({ card }: CatalogCardProps): React.JSX.Element => (
  <li>
    <article className="flex h-full flex-col overflow-hidden rounded-tacha-card border border-tacha-border bg-tacha-surface">
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
  </li>
);
