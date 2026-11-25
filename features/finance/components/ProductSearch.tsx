import { Input } from "@/components/ui";
import { PRODUCT_HISTORY_TEXT } from "../constants/finance.constants";
import type { ProductSearchProps } from "./models/ProductSearchProps.interface";

/**
 * Buscador de la vista "Productos" (D33): con label asociado (SPEC §9). La
 * cantidad de resultados la anuncia la pantalla en role="status", sin mover el
 * foco. Lo que se escribe lo recorta y lo limita el servicio (regla 93).
 */
export const ProductSearch = ({ onChange, value }: ProductSearchProps): React.JSX.Element => (
  <Input label={PRODUCT_HISTORY_TEXT.SEARCH_LABEL} value={value} onChange={onChange} />
);
