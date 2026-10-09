import { describe, expect, it } from "vitest";
import { APP_ROUTE } from "@/constants";
import { resolvePostLoginRoute } from "../utils/resolvePostLoginRoute";

describe("resolvePostLoginRoute", () => {
  it("sends the user into the app, to the general list, instead of the landing", () => {
    expect(resolvePostLoginRoute()).toBe(APP_ROUTE.LIST);
  });
});
