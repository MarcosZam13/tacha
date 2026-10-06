import type { HouseholdRoleType } from "../constants/household.constants";

/** La membresía del usuario actual: a qué household pertenece y con qué rol. */
export interface HouseholdMembership {
  householdName: string;
  role: HouseholdRoleType;
}
