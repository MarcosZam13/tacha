import { useEffect, useRef, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import {
  HOUSEHOLD_MEMBERS_LOAD_MORE_STATUS,
  HOUSEHOLD_MEMBERS_PAGE,
  HOUSEHOLD_MEMBERS_TEXT,
} from "../constants/household.constants";
import type { HouseholdMembersLoadMoreStatusType } from "../constants/household.constants";
import type { HouseholdMember } from "../models/HouseholdMember.interface";
import { getHouseholdMembersPage } from "../services/household.service";

/** La primera página (y las que se le sumaron), guardada junto a la búsqueda que la pidió. */
interface MembersResponse {
  errorMessage: NullableRef<string>;
  hasMore: boolean;
  members: HouseholdMember[];
  requestKey: string;
}

/** "Cargar más" de una búsqueda concreta: cambiar la búsqueda lo deja sin efecto. */
interface LoadMoreState {
  requestKey: string;
  status: HouseholdMembersLoadMoreStatusType;
}

interface UseHouseholdMembersReturn {
  /** Falló la primera página o la búsqueda (role="alert"; se reintenta con onRetry). */
  errorMessage: NullableRef<string>;
  /** Hay más integrantes después de los cargados: se ofrece "Cargar más". */
  hasMore: boolean;
  /** La búsqueda no coincide con nadie (no es un error). */
  hasNoResults: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  /** Falló "Cargar más": la lista cargada se conserva y onLoadMore reintenta. */
  loadMoreErrorMessage: NullableRef<string>;
  members: HouseholdMember[];
  onLoadMore: () => void;
  onQueryChange: (query: string) => void;
  onRetry: () => void;
  query: string;
}

/**
 * Los integrantes de la familia (SCRUM-60): primera página, búsqueda por
 * nombre con debounce, "Cargar más" y reintento. Qué familia, quién la ve y
 * cómo se busca lo decide la base (get_household_members_page, 025).
 *
 * Como useProductSearch, solo se guarda en estado lo que no se puede
 * calcular: el texto escrito, la última respuesta y el estado de "Cargar
 * más". Cada respuesta va con la clave de la búsqueda que la pidió, así una
 * que llega tarde nunca pisa a la búsqueda actual.
 */
export const useHouseholdMembers = (isMember: boolean): UseHouseholdMembersReturn => {
  // Cada cambio de membresía (salir de una familia, crear o unirse a otra) es
  // una generación nueva. Va en la clave de cada respuesta: así nada de la
  // familia anterior se muestra mientras llega la lista de la nueva. Se ajusta
  // durante el render comparando con el valor anterior (patrón de React para
  // reiniciar estado cuando cambia una prop), sin setState en un efecto.
  const [membership, setMembership] = useState<{ generation: number; isMember: boolean }>({
    generation: 0,
    isMember,
  });
  if (membership.isMember !== isMember) {
    setMembership({ generation: membership.generation + 1, isMember });
  }

  const [query, setQuery] = useState<string>("");
  // Sube con "Reintentar": cambia la clave y vuelve a pedir la primera página.
  const [reloadCount, setReloadCount] = useState<number>(0);
  const [response, setResponse] = useState<NullableRef<MembersResponse>>(null);
  const [loadMore, setLoadMore] = useState<NullableRef<LoadMoreState>>(null);
  // Doble clic en "Cargar más": dos clics en el mismo render ven el mismo estado.
  const isLoadingMoreRef = useRef<boolean>(false);
  // Si la pantalla se cierra mientras carga más, la respuesta se ignora.
  const isMountedRef = useRef<boolean>(true);

  // La base recorta y valida igual; acá se recorta para no pedir dos veces lo
  // mismo ("ana" y "ana ") y se acota al mismo tope para no mandar un 22023.
  const term = query.trim().slice(0, HOUSEHOLD_MEMBERS_PAGE.SEARCH_MAX_LENGTH);
  const requestKey = `${membership.generation}:${reloadCount}:${term}`;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isMember) return undefined;

    let isCancelled = false;
    // Debounce: se pide cuando el usuario deja de escribir. Sin búsqueda (al
    // abrir o al borrarla) no hay nada que esperar. Cada tecla nueva corre el
    // cleanup, que cancela el timer anterior.
    const delayMs = term === "" ? 0 : HOUSEHOLD_MEMBERS_PAGE.SEARCH_DEBOUNCE_MS;
    const timerId = setTimeout(() => {
      getHouseholdMembersPage(term, 0)
        .then((membersPage) => {
          if (!isCancelled) setResponse({ errorMessage: null, ...membersPage, requestKey });
        })
        .catch(() => {
          if (!isCancelled) {
            setResponse({ errorMessage: HOUSEHOLD_MEMBERS_TEXT.LOAD_ERROR, hasMore: false, members: [], requestKey });
          }
        });
    }, delayMs);

    return () => {
      clearTimeout(timerId);
      // Una respuesta de una búsqueda vieja que llegue tarde ya no pisa a la nueva.
      isCancelled = true;
    };
  }, [isMember, requestKey, term]);

  // La respuesta solo vale si es de la búsqueda que está escrita ahora.
  const currentResponse = isMember && response?.requestKey === requestKey ? response : null;
  const currentLoadMore = loadMore?.requestKey === requestKey ? loadMore : null;
  const canLoadMore = currentResponse !== null && currentResponse.errorMessage === null && currentResponse.hasMore;

  const appendNextPage = async (loadedResponse: MembersResponse): Promise<void> => {
    const loadedKey = loadedResponse.requestKey;
    setLoadMore({ requestKey: loadedKey, status: HOUSEHOLD_MEMBERS_LOAD_MORE_STATUS.LOADING });

    try {
      const nextPage = await getHouseholdMembersPage(term, loadedResponse.members.length);
      if (!isMountedRef.current) return;
      // Si la búsqueda cambió mientras tanto, la página ya no corresponde.
      setResponse((previous) =>
        previous?.requestKey === loadedKey
          ? { ...previous, hasMore: nextPage.hasMore, members: [...previous.members, ...nextPage.members] }
          : previous,
      );
      setLoadMore((previous) => (previous?.requestKey === loadedKey ? null : previous));
    } catch {
      if (!isMountedRef.current) return;
      setLoadMore((previous) =>
        previous?.requestKey === loadedKey
          ? { requestKey: loadedKey, status: HOUSEHOLD_MEMBERS_LOAD_MORE_STATUS.FAILED }
          : previous,
      );
    } finally {
      isLoadingMoreRef.current = false;
    }
  };

  const onLoadMore = (): void => {
    if (!canLoadMore || isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;
    void appendNextPage(currentResponse);
  };

  const errorMessage = currentResponse?.errorMessage ?? null;
  const members = currentResponse?.members ?? [];

  return {
    errorMessage,
    hasMore: canLoadMore,
    hasNoResults: currentResponse !== null && errorMessage === null && members.length === 0 && term !== "",
    isLoading: isMember && currentResponse === null,
    isLoadingMore: currentLoadMore?.status === HOUSEHOLD_MEMBERS_LOAD_MORE_STATUS.LOADING,
    loadMoreErrorMessage:
      currentLoadMore?.status === HOUSEHOLD_MEMBERS_LOAD_MORE_STATUS.FAILED ? HOUSEHOLD_MEMBERS_TEXT.LOAD_MORE_ERROR : null,
    members,
    onLoadMore,
    onQueryChange: setQuery,
    onRetry: () => setReloadCount((count) => count + 1),
    query,
  };
};
