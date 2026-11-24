// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTE } from "@/constants";
import { PRODUCT_GROUPS_TEXT } from "../constants/product-groups.constants";
import type { ProductGroupSummary } from "../models/product-groups.interfaces";
import { ProductGroups } from "../ProductGroups";
import { listProductGroups } from "../services/product-groups.service";
import { createProductGroupsPage } from "./ProductGroups.page";

// Sin Supabase real: los grupos salen de un servicio simulado.
vi.mock("../services/product-groups.service", () => ({ listProductGroups: vi.fn() }));
const listProductGroupsMock = vi.mocked(listProductGroups);

afterEach(cleanup);

beforeEach(() => {
  listProductGroupsMock.mockReset();
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
});
