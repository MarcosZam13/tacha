"use client";

import { RecipesTabs } from "@/components/recipes-tabs/RecipesTabs";
import { RECIPES_TAB } from "@/constants";
import { MEAL_PLANNER_TEXT } from "./constants/meal-planner.constants";
import { MealPlanLoadError } from "./components/MealPlanLoadError";
import { MealSlotDialog } from "./components/MealSlotDialog";
import { WeekGrid } from "./components/WeekGrid";
import { WeekSelector } from "./components/WeekSelector";
import { useMealPlannerViewModel } from "./hooks/useMealPlannerViewModel";

/**
 * Sub-tab "Planificador semanal" de la sección Recetas: el calendario de la
 * semana actual y la próxima, con la comida asignada a cada espacio. "use
 * client" porque "hoy" sale del reloj del navegador y el plan viene de Supabase
 * desde el navegador (la sesión vive ahí). La grilla se dibuja cuando se conoce
 * "hoy" (nunca en el servidor), para no mostrar un día resaltado que luego cambie.
 */
export const MealPlanner = (): React.JSX.Element => {
  const viewModel = useMealPlannerViewModel();
  const { days, isReady, plan } = viewModel;
  const { onSlotOpen, ...dialog } = viewModel.dialog;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-tacha-text">{MEAL_PLANNER_TEXT.TITLE}</h1>
      <RecipesTabs activeTab={RECIPES_TAB.PLANNER} />
      <WeekSelector
        canGoToNextWeek={viewModel.canGoToNextWeek}
        canGoToPreviousWeek={viewModel.canGoToPreviousWeek}
        onNextWeek={viewModel.onNextWeek}
        onPreviousWeek={viewModel.onPreviousWeek}
        rangeLabel={viewModel.rangeLabel}
        weekLabel={viewModel.weekLabel}
      />
      {plan.hasLoadError ? <MealPlanLoadError onRetry={plan.onPlanRetry} /> : null}
      {isReady ? (
        // Sin leer el plan no se sabe qué espacios tienen receta: no se puede asignar a ciegas.
        <WeekGrid days={days} getEntry={plan.getEntry} isDisabled={!plan.isPlanReady} onSlotOpen={onSlotOpen} />
      ) : null}
      <MealSlotDialog {...dialog} />
    </div>
  );
};
