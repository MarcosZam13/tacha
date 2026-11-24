import Link from "next/link";
import { APP_ROUTE } from "@/constants";
import type { CreateProductGroupLinkProps } from "./models/CreateProductGroupLinkProps.interface";

/**
 * Link con estilo de botón primario a /lista/grupos/nuevo (HU-73 CA-01). Es
 * navegación, no una acción, por eso Link y no Button. Lo usan la cabecera de
 * "Mis grupos" y su estado vacío, cada uno con su texto.
 */
export const CreateProductGroupLink = ({ label }: CreateProductGroupLinkProps): React.JSX.Element => (
  <Link
    href={APP_ROUTE.LIST_GROUP_NEW}
    className="rounded-tacha-badge bg-tacha-teal px-4 py-2 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90"
  >
    {label}
  </Link>
);
