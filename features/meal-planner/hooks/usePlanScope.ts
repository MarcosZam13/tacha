import { useState } from "react";
import { useHasHousehold } from "@/hooks/useHasHousehold";
import { PLAN_SCOPE, PLAN_SCOPE_TEXT } from "../constants/meal-planner.constants";
import type { UsePlanScopeReturn } from "../models/meal-planner.interfaces";
import type { PlanScopeType } from "../models/meal-planner.types";

/** Qué plan se ve. Arranca en el propio; el de la familia se ofrece solo a quien tiene. */
export const usePlanScope = (): UsePlanScopeReturn => {
  const hasHousehold = useHasHousehold();
  const [scope, setScope] = useState<PlanScopeType>(PLAN_SCOPE.PERSONAL);
  const [hasLostHousehold, setHasLostHousehold] = useState(false);

  return {
    canChoose: hasHousehold && !hasLostHousehold,
    notice: hasLostHousehold ? PLAN_SCOPE_TEXT.HOUSEHOLD_LOST : null,
    onHouseholdLost: () => {
      setHasLostHousehold(true);
      setScope(PLAN_SCOPE.PERSONAL);
    },
    onScopeChange: setScope,
    scope,
  };
};
