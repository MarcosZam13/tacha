import type { HouseholdMember } from "./HouseholdMember.interface";

/**
 * Una página de los integrantes de la familia (SCRUM-60), en el orden de la
 * base: el admin primero y después por antigüedad.
 */
export interface HouseholdMembersPage {
  /** true si la base tiene más integrantes después de esta página ("Cargar más"). */
  hasMore: boolean;
  members: HouseholdMember[];
}
