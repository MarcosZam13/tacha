import { useEffect, useState } from "react";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import { getKeptPersonalList } from "../services/shopping-list.service";

/**
 * La lista personal que el usuario eligió mantener al unirse a una familia
 * (SCRUM-59, D4). Se carga una vez al abrir la pantalla. Es aparte de la lista
 * principal: si falla, la pantalla sigue funcionando sin esta sección.
 */
export const useKeptPersonalList = (): ShoppingListItem[] => {
  const [keptItems, setKeptItems] = useState<ShoppingListItem[]>([]);

  useEffect(() => {
    // Si la pantalla se cierra antes de que responda la base, la respuesta se ignora.
    let isCancelled = false;

    getKeptPersonalList()
      .then((items) => {
        if (!isCancelled) setKeptItems(items);
      })
      .catch(() => {
        // Sin aviso: la lista principal no depende de esta sección.
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return keptItems;
};
