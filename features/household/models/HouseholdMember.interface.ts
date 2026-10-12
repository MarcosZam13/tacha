import type { NullableRef } from "@/types/nullable.types";
import type { HouseholdRoleType } from "../constants/household.constants";

/**
 * Un miembro del household, como lo ve el admin al elegir a quién pasarle el
 * rol antes de salir. Lo arma household.service.ts a partir de
 * get_household_members (migración 023), que nunca devuelve el correo.
 */
export interface HouseholdMember {
  /** El nombre del registro; null si no guardó uno (la pantalla muestra un texto genérico). */
  displayName: NullableRef<string>;
  /** true en la fila de quien llama: el admin no puede elegirse a sí mismo. */
  isCurrentUser: boolean;
  role: HouseholdRoleType;
  userId: string;
}
