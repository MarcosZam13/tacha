/**
 * Una fila de resultados ya lista para dibujar. La arma cada feature desde
 * sus datos: la lista general usa id = variante y detail = tamaño; recetas
 * usa id = producto madre, sin detail.
 */
export interface ProductSearchOption {
  detail?: string;
  id: string;
  label: string;
}
