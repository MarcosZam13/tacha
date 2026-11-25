import Link from "next/link";
import { APP_ROUTE } from "@/constants";
import { PRODUCT_GROUP_ADD_TO_LIST_TEXT } from "../constants/product-groups.constants";
import type { ProductGroupAddToListResultProps } from "./models/ProductGroupAddToListResultProps.interface";

/**
 * Resumen (o error) de agregar el grupo a la lista, dentro de su tarjeta.
 * Mismo patrón que RecipeAddToListResult: role="status" / role="alert" para
 * que el lector de pantalla lo anuncie, y "Ver lista" para ir a revisarla.
 * Se queda en "Mis grupos" para poder agregar varios grupos seguidos.
 */
export const ProductGroupAddToListResult = ({ feedback }: ProductGroupAddToListResultProps): React.JSX.Element => (
  <div
    role={feedback.isError ? "alert" : "status"}
    className={`flex flex-col gap-1 font-body text-sm ${feedback.isError ? "text-red-600" : "text-tacha-textsec"}`}
  >
    {feedback.messages.map((message) => (
      <p key={message}>{message}</p>
    ))}
    {feedback.isError ? null : (
      <Link href={APP_ROUTE.LIST} className="self-start font-semibold text-tacha-teal hover:underline">
        {PRODUCT_GROUP_ADD_TO_LIST_TEXT.VIEW_LIST}
      </Link>
    )}
  </div>
);
