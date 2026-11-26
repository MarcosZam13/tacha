import type { DateList } from "../models/DateList.interface";

/**
 * Mismo orden que el servicio: por fecha; en la misma fecha, la nueva al final.
 * sort es estable, así que basta con comparar la fecha.
 * Si ya está no se agrega: la carga pudo traerla antes de que llegara la respuesta de crear.
 */
export const insertByDate = (lists: DateList[], createdList: DateList): DateList[] =>
  lists.some((list) => list.id === createdList.id)
    ? lists
    : [...lists, createdList].sort((first, second) => first.eventDate.localeCompare(second.eventDate));

/**
 * Une la carga inicial con lo que ya está en pantalla. La consulta pudo salir antes de
 * que se creara una sublista y llegar después: reemplazar con su resultado la borraría.
 * Lo que la carga sí trae no se duplica.
 */
export const mergeLoadedLists = (loadedLists: DateList[], currentLists: DateList[]): DateList[] => {
  const loadedIds = new Set(loadedLists.map((list) => list.id));
  return currentLists.filter((list) => !loadedIds.has(list.id)).reduce(insertByDate, loadedLists);
};
