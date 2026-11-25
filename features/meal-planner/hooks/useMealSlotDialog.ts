import { useEffect, useReducer, useRef, useState } from "react";
import {
  COOK_CHOICE,
  COOK_OPTIONS_STATUS,
  MEAL_SLOT_DIALOG_ACTION,
  MEAL_SLOT_DIALOG_STATUS,
  MEAL_SLOT_TEXT,
  PLAN_SCOPE,
  RECIPE_OPTIONS_STATUS,
  SAVE_SLOT_RESULT,
  SERVINGS_MULTIPLIER,
} from "../constants/meal-planner.constants";
import type {
  CookOption,
  MealSlotDialogViewModel,
  MealSlotTarget,
  RecipeOption,
  UseMealSlotDialogParams,
} from "../models/meal-plan.interfaces";
import type { CookChoiceType, RecipeOptionsState, SaveSlotResult } from "../models/meal-plan.types";
import { MEAL_PLAN_SOURCE } from "../services/meal-plan-sources";
import { findSelectedRecipeOption } from "../utils/findSelectedRecipeOption";
import { formatMultiplier } from "../utils/formatMultiplier";
import { getMealSlotName } from "../utils/getMealSlotLabel";
import { CLOSED_DIALOG_STATE, mealSlotDialogReducer } from "../utils/meal-slot-dialog.reducer";
import { toInitialSlotValues } from "../utils/toInitialSlotValues";
import { toSavedMealPlanEntry } from "../utils/toSavedMealPlanEntry";
import { toServingsSummaryText } from "../utils/toServingsSummaryText";
import { useCookOptions } from "./useCookOptions";

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
  onHouseholdLost,
  onRecipeGone,
  onRemoved,
  onSaved,
  scope,
}: UseMealSlotDialogParams): MealSlotDialogViewModel => {
  const [state, dispatch] = useReducer(mealSlotDialogReducer, CLOSED_DIALOG_STATE);
  const [optionsState, setOptionsState] = useState<RecipeOptionsState>(LOADING_OPTIONS);
  // Cambia con "Reintentar" para que el efecto vuelva a pedir las recetas.
  const [optionsReloadKey, setOptionsReloadKey] = useState(0);
  const isRequestInFlightRef = useRef(false);

  const isOpen = state.status !== MEAL_SLOT_DIALOG_STATUS.CLOSED;
  const isFamily = scope === PLAN_SCOPE.FAMILY;
  const cooks = useCookOptions(scope, isOpen);

  useEffect(() => {
    // Si el diálogo se cierra antes de que respondan las recetas, la respuesta se ignora.
    let isCancelled = false;

    if (isOpen) {
      MEAL_PLAN_SOURCE[scope]
        .getRecipeOptions()
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
  }, [isOpen, optionsReloadKey, scope]);

  const reloadRecipeOptions = (): void => {
    setOptionsState(LOADING_OPTIONS);
    setOptionsReloadKey((currentKey) => currentKey + 1);
  };

  // El foco de vuelta al espacio al cerrar lo hace el Modal compartido (SCRUM-142, D4): guarda el
  // elemento enfocado al abrir, y MealSlot enfoca su botón antes de llamar acá (también en Safari).
  const onSlotOpen = (target: MealSlotTarget): void => {
    // Ya abierto (o guardando): un Enter sobre el espacio que quedó detrás del
    // fondo no reabre el diálogo ni pierde el resultado del guardado en curso.
    if (isOpen) return;
    // Las recetas se piden de nuevo en cada apertura: pueden haber cambiado desde la última vez.
    setOptionsState(LOADING_OPTIONS);
    cooks.reload();
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
  const canSave = isEditable && selectedOption !== null;
  const entry = target ? getEntry(target.dateKey, target.mealType) : null;
  const isAssigned = entry !== null;
  // Mientras no se conocen los miembros, el cocinero que ya tenía el espacio se sigue ofreciendo: no se pierde
  // por una carga que falló. Con la lista a mano, uno que ya no está no queda elegido.
  const currentCook: CookOption[] =
    entry?.cookLabel &&
    cooks.status !== COOK_OPTIONS_STATUS.READY &&
    !cooks.options.some((option) => option.value === entry.cookChoice)
      ? [{ label: entry.cookLabel, value: entry.cookChoice }]
      : [];
  const cookOptions = [...currentCook, ...cooks.options];
  const selectedCook = cookOptions.find((option) => option.value === values?.cookChoice) ?? null;
  const cookChoice = selectedCook?.value ?? (values ? COOK_CHOICE.NONE : COOK_CHOICE.SELF);
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

  // No se guardó, pero tampoco hay qué reintentar: el diálogo se cierra y la pantalla avisa.
  const closeWithoutHousehold = (): void => {
    dispatch({ type: MEAL_SLOT_DIALOG_ACTION.SAVE_SUCCEEDED });
    onHouseholdLost();
  };

  const rejectSave = (reason: Exclude<SaveSlotResult["kind"], typeof SAVE_SLOT_RESULT.SAVED>, recipeId: string): void => {
    if (reason === SAVE_SLOT_RESULT.NO_HOUSEHOLD) {
      closeWithoutHousehold();
      return;
    }
    if (reason === SAVE_SLOT_RESULT.COOK_GONE) {
      dispatch({
        type: MEAL_SLOT_DIALOG_ACTION.SAVE_FAILED,
        cookChoice: COOK_CHOICE.NONE,
        errorMessage: MEAL_SLOT_TEXT.COOK_GONE,
      });
      cooks.reload();
      return;
    }
    // La receta se borró o ya no se puede usar: la base responde lo mismo. Se
    // recargan las recetas y deja de estar elegida.
    dispatch({
      type: MEAL_SLOT_DIALOG_ACTION.SAVE_FAILED,
      errorMessage: isFamily ? MEAL_SLOT_TEXT.RECIPE_UNAVAILABLE : MEAL_SLOT_TEXT.RECIPE_GONE,
    });
    reloadRecipeOptions();
    // El cascade ya liberó sus espacios en la base: la grilla deja de mostrarla sin recargar.
    onRecipeGone(recipeId);
  };

  const onSave = (): void => {
    if (!canSave || !target || !values || !selectedOption) return;

    void runRequest(async () => {
      dispatch({ type: MEAL_SLOT_DIALOG_ACTION.SAVE_STARTED });
      try {
        const result = await MEAL_PLAN_SOURCE[scope].saveSlot({
          ...target,
          cookChoice,
          recipeId: selectedOption.id,
          servingsMultiplier: values.servingsMultiplier,
        });
        if (result.kind !== SAVE_SLOT_RESULT.SAVED) {
          rejectSave(result.kind, selectedOption.id);
          return;
        }
        onSaved(
          toSavedMealPlanEntry({
            cookName: selectedCook?.label ?? null,
            option: selectedOption,
            slotId: result.slotId,
            target,
            values: { ...values, cookChoice },
          }),
        );
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
        if (!(await MEAL_PLAN_SOURCE[scope].clearSlot(target))) {
          closeWithoutHousehold();
          return;
        }
        onRemoved(target);
        dispatch({ type: MEAL_SLOT_DIALOG_ACTION.SAVE_SUCCEEDED });
      } catch {
        dispatch({ type: MEAL_SLOT_DIALOG_ACTION.SAVE_FAILED, errorMessage: MEAL_SLOT_TEXT.REMOVE_ERROR });
      }
    });
  };

  const onCookChange = (nextCookChoice: CookChoiceType): void => {
    dispatch({ type: MEAL_SLOT_DIALOG_ACTION.COOK_CHANGED, cookChoice: nextCookChoice });
  };

  return {
    canDecreaseServings: values !== null && values.servingsMultiplier > SERVINGS_MULTIPLIER.MIN,
    canIncreaseServings: values !== null && values.servingsMultiplier < SERVINGS_MULTIPLIER.MAX,
    canSave,
    cookChoice,
    cookOptions,
    cooksStatus: cooks.status,
    errorMessage: state.status === MEAL_SLOT_DIALOG_STATUS.FAILED ? state.errorMessage : null,
    isAssigned,
    isOpen,
    isSaving,
    multiplierLabel: formatMultiplier(values?.servingsMultiplier ?? SERVINGS_MULTIPLIER.DEFAULT),
    onClose: () => dispatch({ type: MEAL_SLOT_DIALOG_ACTION.CLOSED }),
    noRecipesText: isFamily ? MEAL_SLOT_TEXT.NO_FAMILY_RECIPES : MEAL_SLOT_TEXT.NO_RECIPES,
    onCookChange,
    onCooksRetry: cooks.reload,
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
