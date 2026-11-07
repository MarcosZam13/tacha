import { useEffect, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { DATE_LIST_TEXT } from "../constants/date-lists.constants";
import type { DateList } from "../models/DateList.interface";
import { getDateLists } from "../services/date-lists.service";
import { insertByDate, mergeLoadedLists } from "../utils/mergeDateLists";
import { useCreateDateListForm } from "./useCreateDateListForm";
import { useDateCalendar } from "./useDateCalendar";
import type { DateCalendarViewModel } from "./useDateCalendar";
import type { CreateDateListFormViewModel } from "./useCreateDateListForm";

interface UseDateListsViewModelReturn {
  calendar: DateCalendarViewModel;
  form: CreateDateListFormViewModel;
  hasLists: boolean;
  isReady: boolean;
  isLoading: boolean;
  loadErrorMessage: NullableRef<string>;
}

/** ViewModel de /fechas: carga las sublistas y suma la nueva sin recargar (CA-02). */
export const useDateListsViewModel = (): UseDateListsViewModelReturn => {
  const [lists, setLists] = useState<DateList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<NullableRef<string>>(null);
  const calendar = useDateCalendar(lists);
  const form = useCreateDateListForm((createdList) => {
    setLists((current) => insertByDate(current, createdList));
    // Puede ser de otro mes: sin esto no se vería aparecer (CA-02 de SCRUM-77).
    calendar.showMonthOf(createdList.eventDate);
  });

  useEffect(() => {
    let isCancelled = false;

    getDateLists()
      .then((loadedLists) => {
        if (!isCancelled) setLists((current) => mergeLoadedLists(loadedLists, current));
      })
      .catch(() => {
        if (!isCancelled) setLoadErrorMessage(DATE_LIST_TEXT.LOAD_ERROR);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    calendar,
    form,
    hasLists: lists.length > 0,
    isLoading,
    // La grilla depende de la fecha local: se dibuja solo en el navegador, después
    // de cargar. Así el HTML del servidor (en UTC) no choca con el del cliente.
    isReady: !isLoading && !loadErrorMessage,
    loadErrorMessage,
  };
};
