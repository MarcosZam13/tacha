import type { NullableRef } from "@/types/nullable.types";

/**
 * Una compra cerrada del Historial (SCRUM-90), tal como la entrega el servicio.
 * La pantalla decide cómo mostrar los valores nulos (SPEC D8 y regla 29).
 */
export interface PeriodPurchase {
  /** Cuándo se cerró, en ISO (UTC), como lo guarda la base. */
  closedAt: string;
  id: string;
  /** null si la consulta no trajo el nombre, o si viene en blanco (regla 29). */
  storeName: NullableRef<string>;
  /** Lo que se gastó, en colones. null = "sin total"; 0 es un total real (D8). */
  totalAmount: NullableRef<number>;
}
