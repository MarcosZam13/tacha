"use client";

import { RecipesTabs } from "@/components/recipes-tabs/RecipesTabs";
import { RECIPES_TAB } from "@/constants";
import { MEAL_PLANNER_TEXT } from "./constants/meal-planner.constants";
import { WeekGrid } from "./components/WeekGrid";
import { WeekSelector } from "./components/WeekSelector";
import { useMealPlannerViewModel } from "./hooks/useMealPlannerViewModel";

/**
 * Sub-tab "Planificador semanal" de la sección Recetas: el calendario de la
 * semana actual y la próxima. "use client" porque "hoy" sale del reloj del
 * navegador. La grilla se dibuja cuando se conoce "hoy" (nunca en el
 * servidor), para no mostrar un día resaltado que luego cambie.
 */
export const MealPlanner = (): React.JSX.Element => {
  const viewModel = useMealPlannerViewModel();
  const { days, isReady } = viewModel;

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
      {isReady ? <WeekGrid days={days} /> : null}
    </div>
  );
};
