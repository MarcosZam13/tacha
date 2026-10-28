// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOUSEHOLD_MEMBERS_TEXT, HOUSEHOLD_ROLE } from "../constants/household.constants";
import { useHouseholdMembers } from "../hooks/useHouseholdMembers";
import type { HouseholdMember } from "../models/HouseholdMember.interface";
import type { HouseholdMembersPage } from "../models/HouseholdMembersPage.interface";
import { getHouseholdMembersPage } from "../services/household.service";

vi.mock("../services/household.service", () => ({
  getHouseholdMembersPage: vi.fn(),
}));
const pageMock = vi.mocked(getHouseholdMembersPage);

// Ids y nombres inventados (no son de la base).
const createMember = (userId: string, displayName: string): HouseholdMember => ({
  displayName,
  isCurrentUser: false,
  role: HOUSEHOLD_ROLE.MEMBER,
  userId,
});
const ANA = { ...createMember("user-ana", "Ana"), role: HOUSEHOLD_ROLE.ADMIN };
const BETO = createMember("user-beto", "Beto");
const CARLA = createMember("user-carla", "Carla");

const page = (members: HouseholdMember[], hasMore = false): HouseholdMembersPage => ({ hasMore, members });

/** Una respuesta de la base que el test decide cuándo llega. */
const createPending = <Value>() => {
  let resolve: (value: Value) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<Value>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, reject, resolve };
};

// Miembro con la primera página ya cargada.
const renderLoaded = async () => {
  const rendered = renderHook(() => useHouseholdMembers(true));
  await waitFor(() => expect(rendered.result.current.isLoading).toBe(false));
  return rendered;
};

// Sin globals, Testing Library no desmonta solo: un hook que quedara montado
// seguiría pidiendo páginas en el test siguiente.
afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
  pageMock.mockResolvedValue(page([ANA, BETO], true));
});

describe("useHouseholdMembers: first page", () => {
  it("does not load anything without a household", () => {
    const { result } = renderHook(() => useHouseholdMembers(false));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.members).toEqual([]);
    expect(pageMock).not.toHaveBeenCalled();
  });

  it("loads the first page without a search and says there are more", async () => {
    const { result } = renderHook(() => useHouseholdMembers(true));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.members).toEqual([ANA, BETO]));
    expect(pageMock).toHaveBeenCalledWith("", 0);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.errorMessage).toBeNull();
  });

  it("never shows members of the previous household while the new one loads", async () => {
    const { result, rerender } = renderHook(({ isMember }) => useHouseholdMembers(isMember), {
      initialProps: { isMember: true },
    });
    await waitFor(() => expect(result.current.members).toEqual([ANA, BETO]));
    const newHousehold = createPending<HouseholdMembersPage>();
    pageMock.mockReturnValue(newHousehold.promise);

    // Sale de la familia y después crea otra o se une a otra.
    rerender({ isMember: false });
    expect(result.current.members).toEqual([]);
    rerender({ isMember: true });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.members).toEqual([]);
    // La primera página va en un setTimeout (aunque sea de 0 ms): se espera a
    // que se pida antes de responder.
    await waitFor(() => expect(pageMock).toHaveBeenCalledTimes(2));
    await act(async () => newHousehold.resolve(page([CARLA])));
    expect(result.current.members).toEqual([CARLA]);
  });

  it("shows the error and loads again on retry", async () => {
    pageMock.mockRejectedValueOnce(new Error("network"));
    const { result } = await renderLoaded();

    expect(result.current.errorMessage).toBe(HOUSEHOLD_MEMBERS_TEXT.LOAD_ERROR);
    expect(result.current.hasMore).toBe(false);

    act(() => result.current.onRetry());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.members).toEqual([ANA, BETO]));
    expect(result.current.errorMessage).toBeNull();
    expect(pageMock).toHaveBeenCalledTimes(2);
  });
});

describe("useHouseholdMembers: search", () => {
  it("waits until the user stops typing and searches only the last text, trimmed", async () => {
    const { result } = await renderLoaded();
    pageMock.mockResolvedValue(page([BETO]));

    act(() => result.current.onQueryChange("b"));
    act(() => result.current.onQueryChange("be"));
    act(() => result.current.onQueryChange(" bet "));

    await waitFor(() => expect(result.current.members).toEqual([BETO]));
    // La primera página y una sola búsqueda, con el texto recortado.
    expect(pageMock).toHaveBeenCalledTimes(2);
    expect(pageMock).toHaveBeenLastCalledWith("bet", 0);
    expect(result.current.query).toBe(" bet ");
  });

  it("ignores the answer of an older search that arrives late", async () => {
    const { result } = await renderLoaded();
    const olderSearch = createPending<HouseholdMembersPage>();
    pageMock.mockReturnValueOnce(olderSearch.promise).mockResolvedValueOnce(page([CARLA]));

    act(() => result.current.onQueryChange("be"));
    await waitFor(() => expect(pageMock).toHaveBeenCalledWith("be", 0));
    act(() => result.current.onQueryChange("ca"));
    await waitFor(() => expect(result.current.members).toEqual([CARLA]));

    await act(async () => olderSearch.resolve(page([BETO])));

    expect(result.current.members).toEqual([CARLA]);
  });

  it("says there are no results when the search matches nobody", async () => {
    const { result } = await renderLoaded();
    pageMock.mockResolvedValue(page([]));

    act(() => result.current.onQueryChange("zzz"));

    await waitFor(() => expect(result.current.hasNoResults).toBe(true));
    expect(result.current.errorMessage).toBeNull();
  });

  it("limits the search to the maximum length the database accepts", async () => {
    const { result } = await renderLoaded();

    act(() => result.current.onQueryChange("a".repeat(70)));

    await waitFor(() => expect(pageMock).toHaveBeenLastCalledWith("a".repeat(60), 0));
  });
});

describe("useHouseholdMembers: load more", () => {
  it("appends the next page from the number of members already loaded", async () => {
    const { result } = await renderLoaded();
    pageMock.mockResolvedValue(page([CARLA], false));

    await act(async () => result.current.onLoadMore());

    expect(pageMock).toHaveBeenLastCalledWith("", 2);
    expect(result.current.members).toEqual([ANA, BETO, CARLA]);
    expect(result.current.hasMore).toBe(false);
  });

  it("keeps the loaded members on failure and retries with the same button", async () => {
    const { result } = await renderLoaded();
    pageMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(page([CARLA]));

    await act(async () => result.current.onLoadMore());

    expect(result.current.loadMoreErrorMessage).toBe(HOUSEHOLD_MEMBERS_TEXT.LOAD_MORE_ERROR);
    expect(result.current.members).toEqual([ANA, BETO]);
    expect(result.current.hasMore).toBe(true);

    await act(async () => result.current.onLoadMore());

    expect(result.current.loadMoreErrorMessage).toBeNull();
    expect(result.current.members).toEqual([ANA, BETO, CARLA]);
  });

  it("sends a single request on a double click", async () => {
    const { result } = await renderLoaded();
    const nextPage = createPending<HouseholdMembersPage>();
    pageMock.mockReturnValue(nextPage.promise);

    // Los dos clics en el mismo render: ven el mismo estado.
    act(() => {
      result.current.onLoadMore();
      result.current.onLoadMore();
    });

    expect(result.current.isLoadingMore).toBe(true);
    await act(async () => nextPage.resolve(page([CARLA])));
    // La primera página y una sola de "Cargar más".
    expect(pageMock).toHaveBeenCalledTimes(2);
  });

  it("drops a next page that arrives after the search changed", async () => {
    const { result } = await renderLoaded();
    const nextPage = createPending<HouseholdMembersPage>();
    pageMock.mockReturnValueOnce(nextPage.promise).mockResolvedValueOnce(page([BETO]));

    act(() => result.current.onLoadMore());
    act(() => result.current.onQueryChange("be"));
    await waitFor(() => expect(result.current.members).toEqual([BETO]));

    await act(async () => nextPage.resolve(page([CARLA])));

    expect(result.current.members).toEqual([BETO]);
    expect(result.current.isLoadingMore).toBe(false);
  });

  it("does nothing when there are no more members", async () => {
    pageMock.mockResolvedValue(page([ANA], false));
    const { result } = await renderLoaded();

    act(() => result.current.onLoadMore());

    expect(pageMock).toHaveBeenCalledTimes(1);
  });
});
