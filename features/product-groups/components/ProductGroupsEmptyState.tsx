import Link from "next/link";
import { APP_ROUTE } from "@/constants";
import { PRODUCT_GROUPS_TEXT } from "../constants/product-groups.constants";

/**
 * Estado vacío de "Mis grupos" (CA-02 de HU-72), con el texto literal del
 * ticket, y el botón "Crear tu primer grupo" (HU-73, docs/DESIGN.md).
 */
export const ProductGroupsEmptyState = (): React.JSX.Element => (
  <div className="flex flex-col items-center gap-4 rounded-tacha-badge border border-dashed border-tacha-border px-4 py-8">
    <p className="text-center font-body text-sm text-tacha-textsec">{PRODUCT_GROUPS_TEXT.EMPTY_SUGGESTION}</p>
    <Link
      href={APP_ROUTE.LIST_GROUP_NEW}
      className="rounded-tacha-badge bg-tacha-teal px-4 py-2 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90"
    >
      {PRODUCT_GROUPS_TEXT.CREATE_FIRST_GROUP}
    </Link>
  </div>
);
