// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTE } from "@/constants";
import { PRODUCT_GROUPS_TEXT } from "../constants/product-groups.constants";
import type { ProductGroupSummary } from "../models/product-groups.interfaces";
import { ProductGroups } from "../ProductGroups";
import { addGroupToList, listProductGroups } from "../services/product-groups.service";
import { createProductGroupsPage } from "./ProductGroups.page";

// Sin Supabase real: los grupos salen de un servicio simulado.
vi.mock("../services/product-groups.service", () => ({ addGroupToList: vi.fn(), listProductGroups: vi.fn() }));
const listProductGroupsMock = vi.mocked(listProductGroups);
const addGroupToListMock = vi.mocked(addGroupToList);

afterEach(cleanup);

beforeEach(() => {
  listProductGroupsMock.mockReset();
  addGroupToListMock.mockReset();
});

const PERSONAL_GROUP: ProductGroupSummary = {
  id: "group-1",
  isShared: false,
  name: "Mercado quincenal",
  productCount: 8,
};

const SHARED_GROUP: ProductGroupSummary = {
  id: "group-2",
  isShared: true,
  name: "Desayunos",
  productCount: 1,
};

describe("ProductGroups", () => {
  // SCRUM-110 (HU-73 CA-01): "+ Crear grupo" siempre; "Crear tu primer grupo" solo sin grupos.
  it("links to the group editor from the header and from the empty state", async () => {
    listProductGroupsMock.mockResolvedValue([]);
    render(<ProductGroups />);
    const page = createProductGroupsPage();

    expect(page.getCreateGroupLink()).toHaveAttribute("href", APP_ROUTE.LIST_GROUP_NEW);
    await waitFor(() => expect(page.queryCreateFirstGroupLink()).toHaveAttribute("href", APP_ROUTE.LIST_GROUP_NEW));
  });

  it("does not show the empty state button when there are groups", async () => {
    listProductGroupsMock.mockResolvedValue([PERSONAL_GROUP]);
    render(<ProductGroups />);
    const page = createProductGroupsPage();

    await waitFor(() => expect(page.queryCardNames()).toEqual([PERSONAL_GROUP.name]));
    expect(page.queryCreateFirstGroupLink()).not.toBeInTheDocument();
  });

  it("shows the title and a link back to the list", async () => {
    listProductGroupsMock.mockResolvedValue([]);
    render(<ProductGroups />);
    const page = createProductGroupsPage();

    expect(page.getTitle()).toBeInTheDocument();
    expect(page.getBackLink()).toHaveAttribute("href", APP_ROUTE.LIST);
    await waitFor(() => expect(page.queryEmptyState()).toBeInTheDocument());
  });

  it("shows a loading indicator while the groups are on their way", () => {
    listProductGroupsMock.mockReturnValue(new Promise(() => {}));
    render(<ProductGroups />);
    const page = createProductGroupsPage();

    expect(page.getSpinner()).toBeInTheDocument();
  });

  // CA-01 (caso 2): una tarjeta por grupo con su nombre y cuántos productos tiene.
  it("shows one card per group with its name and product count", async () => {
    listProductGroupsMock.mockResolvedValue([PERSONAL_GROUP, SHARED_GROUP]);
    render(<ProductGroups />);
    const page = createProductGroupsPage();

    await waitFor(() => expect(page.queryCardNames()).toEqual(["Mercado quincenal", "Desayunos"]));
    expect(page.getCountLabel("Mercado quincenal")).toBe("8 productos");
    expect(page.getCountLabel("Desayunos")).toBe("1 producto");
  });

  // CA-01 (caso 3): el grupo compartido con la familia lleva la etiqueta.
  it("marks only the shared groups as shared", async () => {
    listProductGroupsMock.mockResolvedValue([PERSONAL_GROUP, SHARED_GROUP]);
    render(<ProductGroups />);
    const page = createProductGroupsPage();

    await waitFor(() => expect(page.queryCardNames()).toHaveLength(2));
    expect(page.querySharedBadge("Desayunos")).toBeInTheDocument();
    expect(page.querySharedBadge("Mercado quincenal")).not.toBeInTheDocument();
  });

  // CA-02 (caso 5): sin grupos, el estado vacío con el texto del ticket.
  it("shows the empty state text from the ticket when there are no groups", async () => {
    listProductGroupsMock.mockResolvedValue([]);
    render(<ProductGroups />);
    const page = createProductGroupsPage();

    await waitFor(() => expect(page.getEmptyState()).toBeInTheDocument());
    expect(page.queryCardNames()).toHaveLength(0);
  });

  // Caso 6: si la lectura falla, error + "Reintentar".
  it("shows an error when the groups cannot be loaded", async () => {
    listProductGroupsMock.mockRejectedValue(new Error("network error"));
    render(<ProductGroups />);
    const page = createProductGroupsPage();

    await waitFor(() => expect(page.getError()).toHaveTextContent(PRODUCT_GROUPS_TEXT.ERROR));
    expect(page.queryEmptyState()).not.toBeInTheDocument();
  });

  it("loads the groups again after retrying", async () => {
    listProductGroupsMock.mockRejectedValueOnce(new Error("network error")).mockResolvedValueOnce([PERSONAL_GROUP]);
    render(<ProductGroups />);
    const page = createProductGroupsPage();
    await waitFor(() => expect(page.getError()).toBeInTheDocument());

    await page.retry();

    await waitFor(() => expect(page.queryCardNames()).toEqual(["Mercado quincenal"]));
    expect(page.queryError()).not.toBeInTheDocument();
    expect(listProductGroupsMock).toHaveBeenCalledTimes(2);
  });

  // SCRUM-111 (HU-74 CA-01): cada tarjeta agrega su grupo a la lista.
  describe("Agregar a lista", () => {
    it("adds the group and shows the summary with a link to the list", async () => {
      listProductGroupsMock.mockResolvedValue([PERSONAL_GROUP, SHARED_GROUP]);
      addGroupToListMock.mockResolvedValue({ added: ["Leche", "Café"], skipped: [] });
      render(<ProductGroups />);
      const page = createProductGroupsPage();
      await waitFor(() => expect(page.queryCardNames()).toHaveLength(2));

      await page.addToList(PERSONAL_GROUP.name);

      expect(addGroupToListMock).toHaveBeenCalledWith(PERSONAL_GROUP.id);
      await waitFor(() =>
        expect(page.queryCardStatus(PERSONAL_GROUP.name)).toHaveTextContent(
          `Agregamos 2 productos de «${PERSONAL_GROUP.name}» a tu lista.`,
        ),
      );
      expect(page.queryViewListLink(PERSONAL_GROUP.name)).toHaveAttribute("href", APP_ROUTE.LIST);
      // El resumen queda solo en la tarjeta del grupo agregado.
      expect(page.queryCardStatus(SHARED_GROUP.name)).not.toBeInTheDocument();
    });

    it("disables every add button while a group is being added", async () => {
      listProductGroupsMock.mockResolvedValue([PERSONAL_GROUP, SHARED_GROUP]);
      addGroupToListMock.mockReturnValue(new Promise(() => {}));
      render(<ProductGroups />);
      const page = createProductGroupsPage();
      await waitFor(() => expect(page.queryCardNames()).toHaveLength(2));

      await page.addToList(PERSONAL_GROUP.name);

      expect(page.getAddToListButton(PERSONAL_GROUP.name)).toBeDisabled();
      expect(page.getAddToListButton(PERSONAL_GROUP.name)).toHaveTextContent("Agregando…");
      expect(page.getAddToListButton(SHARED_GROUP.name)).toBeDisabled();
      expect(page.getAddToListButton(SHARED_GROUP.name)).toHaveTextContent("Agregar a lista");
      expect(addGroupToListMock).toHaveBeenCalledTimes(1);
    });

    it("shows the error in the card when adding fails", async () => {
      listProductGroupsMock.mockResolvedValue([PERSONAL_GROUP]);
      addGroupToListMock.mockRejectedValue(new Error("boom"));
      render(<ProductGroups />);
      const page = createProductGroupsPage();
      await waitFor(() => expect(page.queryCardNames()).toHaveLength(1));

      await page.addToList(PERSONAL_GROUP.name);

      await waitFor(() =>
        expect(page.queryCardAlert(PERSONAL_GROUP.name)).toHaveTextContent("No pudimos agregar el grupo. Intenta de nuevo."),
      );
      expect(page.queryViewListLink(PERSONAL_GROUP.name)).not.toBeInTheDocument();
    });

    // Otro miembro lo borró: se vuelve a pedir la lista de grupos (ya sin él)
    // y el aviso sigue visible aunque su tarjeta desaparezca.
    it("reloads the groups and keeps the notice when the group no longer exists", async () => {
      listProductGroupsMock.mockResolvedValueOnce([PERSONAL_GROUP, SHARED_GROUP]).mockResolvedValueOnce([SHARED_GROUP]);
      addGroupToListMock.mockResolvedValue(null);
      render(<ProductGroups />);
      const page = createProductGroupsPage();
      await waitFor(() => expect(page.queryCardNames()).toHaveLength(2));

      await page.addToList(PERSONAL_GROUP.name);

      await waitFor(() => expect(page.queryCardNames()).toEqual([SHARED_GROUP.name]));
      expect(listProductGroupsMock).toHaveBeenCalledTimes(2);
      expect(page.queryError()).toHaveTextContent("Este grupo ya no existe.");
    });
  });
});
