import { useEffect, useReducer, useRef, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import {
  COOK_CHOICE,
  MEAL_SLOT_DIALOG_ACTION,
  MEAL_SLOT_DIALOG_STATUS,
  MEAL_SLOT_TEXT,
  RECIPE_OPTIONS_STATUS,
  SERVINGS_MULTIPLIER,
} from "../constants/meal-planner.constants";
import type {
  MealSlotDialogViewModel,
  MealSlotTarget,
  RecipeOption,
  UseMealSlotDialogParams,
} from "../models/meal-plan.interfaces";
import type { CookChoiceType, RecipeOptionsState } from "../models/meal-plan.types";
import { clearMealSlot, getRecipeOptions, saveMealSlot } from "../services/meal-plan.service";
import { findSelectedRecipeOption } from "../utils/findSelectedRecipeOption";
import { formatMultiplier } from "../utils/formatMultiplier";
import { getMealSlotName } from "../utils/getMealSlotLabel";
import { CLOSED_DIALOG_STATE, mealSlotDialogReducer } from "../utils/meal-slot-dialog.reducer";
import { toInitialSlotValues } from "../utils/toInitialSlotValues";
import { toSavedMealPlanEntry } from "../utils/toSavedMealPlanEntry";
import { toServingsSummaryText } from "../utils/toServingsSummaryText";

const LOADING_OPTIONS: RecipeOptionsState = { status: RECIPE_OPTIONS_STATUS.LOADING };

/**
 * El diálogo de asignar una receta a un espacio: abrirlo, elegir receta,
 * cocinero y multiplicador, guardar y quitar. Las reglas de edición viven en el
 * reducer (utils/meal-slot-dialog.reducer.ts); acá van los efectos: cargar las
 * recetas, llamar a la base y avisarle al plan lo que cambió.
 *
 * Una sola petición a la vez: un doble clic en "Guardar" o "Quitar" no manda
 * dos (SPEC regla 19). Se usa una referencia y no el estado, porque dos clics
 * seguidos llegan antes de que React vuelva a dibujar.
 */
export const useMealSlotDialog = ({
  getDayLongLabel,
  getEntry,
  onRemoved,
  onSaved,
}: UseMealSlotDialogParams): MealSlotDialogViewModel => {
  const [state, dispatch] = useReducer(mealSlotDialogReducer, CLOSED_DIALOG_STATE);
  const [optionsState, setOptionsState] = useState<RecipeOptionsState>(LOADING_OPTIONS);
  // Cambia con "Reintentar" para que el efecto vuelva a pedir las recetas.
  const [optionsReloadKey, setOptionsReloadKey] = useState(0);
  const isRequestInFlightRef = useRef(false);
  // El botón que abrió el diálogo: al cerrarlo el foco vuelve ahí (SPEC §9).
  const openerRef = useRef<NullableRef<HTMLElement>>(null);
  const wasOpenRef = useRef(false);

  const isOpen = state.status !== MEAL_SLOT_DIALOG_STATUS.CLOSED;

  useEffect(() => {
    // Si el diálogo se cierra antes de que respondan las recetas, la respuesta se ignora.
    let isCancelled = false;

    if (isOpen) {
      getRecipeOptions()
        .then((options) => {
          if (!isCancelled) setOptionsState({ options, status: RECIPE_OPTIONS_STATUS.READY });
        })
        .catch(() => {
          if (!isCancelled) setOptionsState({ status: RECIPE_OPTIONS_STATUS.ERROR });
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [isOpen, optionsReloadKey]);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) openerRef.current?.focus();
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const reloadRecipeOptions = (): void => {
    setOptionsState(LOADING_OPTIONS);
    setOptionsReloadKey((currentKey) => currentKey + 1);
  };

  const onSlotOpen = (target: MealSlotTarget, opener?: HTMLElement): void => {
    // El botón tocado, si lo mandan: en Safari un clic no lo enfoca y activeElement sería el body.
    openerRef.current = opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    // Las recetas se piden de nuevo en cada apertura: pueden haber cambiado desde la última vez.
    setOptionsState(LOADING_OPTIONS);
    dispatch({
      type: MEAL_SLOT_DIALOG_ACTION.OPENED,
      target,
      values: toInitialSlotValues(getEntry(target.dateKey, target.mealType)),
    });
  };

  // Valores derivados: se calculan una vez por render.
  const isEditable = state.status === MEAL_SLOT_DIALOG_STATUS.EDITING || state.status === MEAL_SLOT_DIALOG_STATUS.FAILED;
  const isSaving = state.status === MEAL_SLOT_DIALOG_STATUS.SAVING;
  const target = isOpen ? state.target : null;
  const values = isOpen ? state.values : null;
  const options: RecipeOption[] = optionsState.status === RECIPE_OPTIONS_STATUS.READY ? optionsState.options : [];
  const areOptionsReady = optionsState.status === RECIPE_OPTIONS_STATUS.READY;
  const selectedOption = findSelectedRecipeOption(values?.recipeId ?? null, options);
  // Con las opciones cargadas, solo cuenta la receta que sigue entre ellas; antes se muestra la que venía.
  const selectedRecipeId = areOptionsReady ? (selectedOption?.id ?? null) : (values?.recipeId ?? null);
  const isAssigned = target ? getEntry(target.dateKey, target.mealType) !== null : false;
  const canSave = isEditable && selectedOption !== null;
  const dayLongLabel = target ? getDayLongLabel(target.dateKey) : null;

  const runRequest = async (request: () => Promise<void>): Promise<void> => {
    if (isRequestInFlightRef.current) return;
    isRequestInFlightRef.current = true;
    try {
      await request();
    } finally {
      isRequestInFlightRef.current = false;
    }
  };

  const onSave = (): void => {
    if (!canSave || !target || !values || !selectedOption) return;

    void runRequest(async () => {
      dispatch({ type: MEAL_SLOT_DIALOG_ACTION.SAVE_STARTED });
      try {
        const response = await saveMealSlot({
          ...target,
          cookChoice: values.cookChoice,
          recipeId: selectedOption.id,
          servingsMultiplier: values.servingsMultiplier,
        });
        if (!response) {
          // La receta se borró en otra pestaña o es ajena: la base responde lo
          // mismo en los dos casos. Se recargan las recetas y deja de estar elegida.
          dispatch({ type: MEAL_SLOT_DIALOG_ACTION.SAVE_FAILED, errorMessage: MEAL_SLOT_TEXT.RECIPE_GONE });
          reloadRecipeOptions();
          return;
        }
        onSaved(toSavedMealPlanEntry({ option: selectedOption, slotId: response.slotId, target, values }));
        dispatch({ type: MEAL_SLOT_DIALOG_ACTION.SAVE_SUCCEEDED });
      } catch {
        // La RPC es todo o nada: si falló, el espacio quedó como estaba.
        dispatch({ type: MEAL_SLOT_DIALOG_ACTION.SAVE_FAILED, errorMessage: MEAL_SLOT_TEXT.SAVE_ERROR });
      }
    });
  };

  const onRemove = (): void => {
    if (!isEditable || !target || !isAssigned) return;

    void runRequest(async () => {
      dispatch({ type: MEAL_SLOT_DIALOG_ACTION.SAVE_STARTED });
      try {
        await clearMealSlot(target);
        onRemoved(target);
        dispatch({ type: MEAL_SLOT_DIALOG_ACTION.SAVE_SUCCEEDED });
      } catch {
        dispatch({ type: MEAL_SLOT_DIALOG_ACTION.SAVE_FAILED, errorMessage: MEAL_SLOT_TEXT.REMOVE_ERROR });
      }
    });
  };

  const onCookChange = (cookChoice: CookChoiceType): void => {
    dispatch({ type: MEAL_SLOT_DIALOG_ACTION.COOK_CHANGED, cookChoice });
  };

  return {
    canDecreaseServings: values !== null && values.servingsMultiplier > SERVINGS_MULTIPLIER.MIN,
    canIncreaseServings: values !== null && values.servingsMultiplier < SERVINGS_MULTIPLIER.MAX,
    canSave,
    cookChoice: values?.cookChoice ?? COOK_CHOICE.SELF,
    errorMessage: state.status === MEAL_SLOT_DIALOG_STATUS.FAILED ? state.errorMessage : null,
    isAssigned,
    isOpen,
    isSaving,
    multiplierLabel: formatMultiplier(values?.servingsMultiplier ?? SERVINGS_MULTIPLIER.DEFAULT),
    onClose: () => dispatch({ type: MEAL_SLOT_DIALOG_ACTION.CLOSED }),
    onCookChange,
    onMultiplierDecrease: () => dispatch({ type: MEAL_SLOT_DIALOG_ACTION.MULTIPLIER_DECREASED }),
    onMultiplierIncrease: () => dispatch({ type: MEAL_SLOT_DIALOG_ACTION.MULTIPLIER_INCREASED }),
    onRecipeChoose: (recipeId: string) => dispatch({ type: MEAL_SLOT_DIALOG_ACTION.RECIPE_CHOSEN, recipeId }),
    onRecipesRetry: reloadRecipeOptions,
    onRemove,
    onSave,
    onSlotOpen,
    recipeOptions: options,
    recipesStatus: optionsState.status,
    selectedRecipeId,
    servingsSummary: selectedOption && values ? toServingsSummaryText(selectedOption.baseServings, values.servingsMultiplier) : null,
    subtitle: target && dayLongLabel ? getMealSlotName(target.mealType, dayLongLabel) : null,
    title: isAssigned ? MEAL_SLOT_TEXT.CHANGE_TITLE : MEAL_SLOT_TEXT.ASSIGN_TITLE,
  };
};
