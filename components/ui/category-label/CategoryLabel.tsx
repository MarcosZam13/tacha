import type { CategoryLabelProps } from "./models/CategoryLabelProps.interface";

/** Encabezado de sección/categoría — uppercase, tracking amplio (DESIGN.md §5). */
export const CategoryLabel = ({ children }: CategoryLabelProps): React.JSX.Element => (
  <h3 className="font-body text-xs font-semibold tracking-widest text-tacha-textsec uppercase">
    {children}
  </h3>
);
