import { useEffect, useState } from "react";
import { COOK_CHOICE, COOK_OPTIONS_STATUS, MEAL_SLOT_TEXT, PLAN_SCOPE } from "../constants/meal-planner.constants";
import type { CookOption, UseCookOptionsReturn } from "../models/meal-plan.interfaces";
import type { CookOptionsState } from "../models/meal-plan.types";
import type { PlanScopeType } from "../models/meal-planner.types";
import { getOtherHouseholdCooks } from "../services/household-meal-plan.service";

const SELF_OPTION: CookOption = { label: MEAL_SLOT_TEXT.COOK_SELF, value: COOK_CHOICE.SELF };
const NONE_OPTION: CookOption = { label: MEAL_SLOT_TEXT.COOK_NONE, value: COOK_CHOICE.NONE };
const LOADING: CookOptionsState = { status: COOK_OPTIONS_STATUS.LOADING };
// En el plan propio no hay nada que cargar.
const NO_MEMBERS: CookOptionsState = { members: [], status: COOK_OPTIONS_STATUS.READY };

/**
 * A quién se puede elegir de cocinero. En el plan de la familia pide los miembros
 * en cada apertura; si falla, "Yo" y "Sin cocinero" siguen sirviendo (SPEC 18.5).
 */
export const useCookOptions = (scope: PlanScopeType, isOpen: boolean): UseCookOptionsReturn => {
  const [membersState, setMembersState] = useState<CookOptionsState>(LOADING);
  const [reloadKey, setReloadKey] = useState(0);
  const isFamily = scope === PLAN_SCOPE.FAMILY;

  useEffect(() => {
    let isCancelled = false;

    if (isFamily && isOpen) {
      getOtherHouseholdCooks()
        .then((members) => {
          if (!isCancelled) setMembersState({ members, status: COOK_OPTIONS_STATUS.READY });
        })
        .catch(() => {
          if (!isCancelled) setMembersState({ status: COOK_OPTIONS_STATUS.ERROR });
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [isFamily, isOpen, reloadKey]);

  const state = isFamily ? membersState : NO_MEMBERS;
  const members = state.status === COOK_OPTIONS_STATUS.READY ? state.members : [];

  return {
    options: [SELF_OPTION, ...members, NONE_OPTION],
    reload: () => {
      setMembersState(LOADING);
      setReloadKey((currentKey) => currentKey + 1);
    },
    status: state.status,
  };
};
