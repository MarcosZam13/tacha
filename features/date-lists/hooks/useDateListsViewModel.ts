import { useEffect, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { DATE_LIST_TEXT } from "../constants/date-lists.constants";
import type { DateList } from "../models/DateList.interface";
import { getDateLists } from "../services/date-lists.service";
import { useCreateDateListForm } from "./useCreateDateListForm";
import type { CreateDateListFormViewModel } from "./useCreateDateListForm";

interface UseDateListsViewModelReturn {
  form: CreateDateListFormViewModel;
  isEmpty: boolean;
  isLoading: boolean;
  lists: DateList[];
  loadErrorMessage: NullableRef<string>;
}

// Mismo orden que el servicio: por fecha; en la misma fecha, la nueva al final.
// sort es estable, así que basta con comparar la fecha.
const insertByDate = (lists: DateList[], createdList: DateList): DateList[] =>
  [...lists, createdList].sort((first, second) => first.eventDate.localeCompare(second.eventDate));

/** ViewModel de /fechas: carga las sublistas y suma la nueva sin recargar (CA-02). */
export const useDateListsViewModel = (): UseDateListsViewModelReturn => {
  const [lists, setLists] = useState<DateList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<NullableRef<string>>(null);
  const form = useCreateDateListForm((createdList) => setLists((current) => insertByDate(current, createdList)));

  useEffect(() => {
    let isCancelled = false;

    getDateLists()
      .then((loadedLists) => {
        if (!isCancelled) setLists(loadedLists);
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
    form,
    isEmpty: !isLoading && !loadErrorMessage && lists.length === 0,
    isLoading,
    lists,
    loadErrorMessage,
  };
};
