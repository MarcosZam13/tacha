import { describe, expect, it } from "vitest";
import { APP_ROUTE } from "@/constants";
import { isRouteActive } from "../utils/isRouteActive";

describe("isRouteActive", () => {
  it("is active on the exact route", () => {
    expect(isRouteActive(APP_ROUTE.RECIPES, APP_ROUTE.RECIPES)).toBe(true);
  });

  it("is active on a subroute, so editing a recipe still marks Recetas", () => {
    expect(isRouteActive(`${APP_ROUTE.RECIPES}/nueva`, APP_ROUTE.RECIPES)).toBe(true);
    expect(isRouteActive(`${APP_ROUTE.RECIPES}/abc/editar`, APP_ROUTE.RECIPES)).toBe(true);
  });

  it("is not active on another section", () => {
    expect(isRouteActive(APP_ROUTE.LIST, APP_ROUTE.RECIPES)).toBe(false);
  });

  it("is not active on a route that only starts with the same letters", () => {
    // "/listas-privadas" no es una subruta de "/lista".
    expect(isRouteActive(`${APP_ROUTE.LIST}s-privadas`, APP_ROUTE.LIST)).toBe(false);
  });
});
