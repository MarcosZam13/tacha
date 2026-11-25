// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProductGroupListAddition } from "../hooks/useProductGroupListAddition";
import { addGroupToList } from "../services/product-groups.service";

// Sin Supabase real: la base responde lo que el test decide.
vi.mock("../services/product-groups.service", () => ({ addGroupToList: vi.fn() }));
const addGroupToListMock = vi.mocked(addGroupToList);

const GROUP = { id: "group-1", name: "Desayuno" };

beforeEach(() => {
  addGroupToListMock.mockReset();
});

describe("useProductGroupListAddition", () => {
  // La vista deshabilita el botón, pero dos clics en el mismo render llegan
  // antes de que se vuelva a pintar: el hook es el que corta el segundo.
  it("sends the group only once when it is asked twice before the first answer", async () => {
    addGroupToListMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useProductGroupListAddition(vi.fn()));

    act(() => {
      result.current.onAddToList(GROUP);
      result.current.onAddToList(GROUP);
    });

    expect(addGroupToListMock).toHaveBeenCalledTimes(1);
    expect(result.current.getGroupAddToList(GROUP.id).isAdding).toBe(true);
  });

  it("shows the missing-group notice, asks to reload, and clears it on the next add", async () => {
    const onGroupMissing = vi.fn();
    addGroupToListMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ added: ["Leche"], skipped: [] });
    const { result } = renderHook(() => useProductGroupListAddition(onGroupMissing));

    act(() => result.current.onAddToList(GROUP));

    await waitFor(() => expect(result.current.missingGroupNotice).toBe("Este grupo ya no existe."));
    expect(onGroupMissing).toHaveBeenCalledTimes(1);
    // El aviso es de pantalla: ninguna tarjeta queda con un mensaje.
    expect(result.current.getGroupAddToList(GROUP.id).feedback).toBeNull();

    act(() => result.current.onAddToList(GROUP));

    expect(result.current.missingGroupNotice).toBeNull();
    await waitFor(() => expect(result.current.getGroupAddToList(GROUP.id).feedback?.isError).toBe(false));
  });
});
