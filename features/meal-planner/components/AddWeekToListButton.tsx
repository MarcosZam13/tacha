import { Button } from "@/components/ui";
import { WEEK_LIST_TEXT } from "../constants/meal-planner.constants";
import type { AddWeekToListButtonProps } from "./models/AddWeekToListButtonProps.type";

/**
 * "Agregar semana a la lista". Actúa sobre la semana que está a la vista y
 * queda deshabilitado si no hay comidas asignadas, el plan no se leyó o hay otro
 * diálogo abierto. Solo presentación: cuándo se puede usar lo decide el ViewModel.
 */
export const AddWeekToListButton = ({ canOpen, onOpen }: AddWeekToListButtonProps): React.JSX.Element => (
  <Button isDisabled={!canOpen} onClick={onOpen}>
    {WEEK_LIST_TEXT.BUTTON}
  </Button>
);
