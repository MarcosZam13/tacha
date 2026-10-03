import { Button, Spinner } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import type { ShoppingListItemDetailProps } from "./models/ShoppingListItemDetailProps.interface";

/**
 * Contenido del modal de detalle. El nombre va en el título del modal; acá
 * van la presentación, las marcas y el precio por supermercado. Todo llega
 * ya calculado y formateado desde el ViewModel.
 */
export const ShoppingListItemDetail = ({ detail, onClose }: ShoppingListItemDetailProps): React.JSX.Element => (
  <div className="flex flex-col gap-4 font-body text-sm text-tacha-text">
    <section>
      <h3 className="font-semibold">{SHOPPING_LIST_TEXT.DETAIL_PRESENTATION}</h3>
      <p className="text-tacha-textsec">{detail.sizeLabel}</p>
    </section>

    {detail.isLoading ? <Spinner /> : null}
    {detail.errorMessage ? (
      <p role="alert" className="text-red-600">
        {detail.errorMessage}
      </p>
    ) : null}

    {!detail.isLoading && !detail.errorMessage ? (
      <>
        <section>
          <h3 className="font-semibold">{SHOPPING_LIST_TEXT.DETAIL_BRANDS}</h3>
          {detail.brands.length > 0 ? (
            <ul className="text-tacha-textsec">
              {detail.brands.map((brand) => (
                <li key={brand}>{brand}</li>
              ))}
            </ul>
          ) : (
            <p className="text-tacha-textsec">{SHOPPING_LIST_TEXT.DETAIL_NO_BRANDS}</p>
          )}
        </section>

        <section>
          <h3 className="font-semibold">{SHOPPING_LIST_TEXT.DETAIL_PRICES}</h3>
          {detail.priceRows.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {detail.priceRows.map((priceRow) => (
                <li key={priceRow.storeName} className="flex justify-between gap-3">
                  <span className="text-tacha-textsec">{priceRow.storeName}</span>
                  <span className="font-semibold">{priceRow.priceLabel}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-tacha-textsec">{SHOPPING_LIST_TEXT.DETAIL_NO_PRICES}</p>
          )}
        </section>
      </>
    ) : null}

    <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onClose}>
      {SHOPPING_LIST_TEXT.DETAIL_CLOSE}
    </Button>
  </div>
);
