/** Un producto de la lista personal que se eligió mantener, listo para mostrar. */
export interface KeptPersonalListRow {
  id: string;
  productName: string;
  quantity: number;
  sizeLabel: string;
}

/** La sección "Mi lista personal" (SCRUM-59, D4): solo lectura. */
export interface KeptPersonalListSectionProps {
  rows: KeptPersonalListRow[];
}
