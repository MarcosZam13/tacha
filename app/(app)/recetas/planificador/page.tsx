import type { Metadata } from "next";
import { MealPlanner } from "@/features/meal-planner/MealPlanner";
import { MEAL_PLANNER_TEXT } from "@/features/meal-planner/constants/meal-planner.constants";

export const metadata: Metadata = {
  title: MEAL_PLANNER_TEXT.PAGE_TITLE,
};

const PlanificadorPage = (): React.JSX.Element => <MealPlanner />;

export default PlanificadorPage;
