import { describe, expect, it } from "vitest";
import { APP_ROUTE } from "@/constants";
import { resolvePostLoginRoute } from "../utils/resolvePostLoginRoute";

describe("resolvePostLoginRoute", () => {
  it("sends the user into the app, to the general list, instead of the landing", () => {
    expect(resolvePostLoginRoute()).toBe(APP_ROUTE.LIST);
  });

  it("sends the user back to the internal path they came from", () => {
    expect(resolvePostLoginRoute("/invitacion/0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0")).toBe(
      "/invitacion/0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0",
    );
  });

  it("falls back to the general list when next points to another site", () => {
    expect(resolvePostLoginRoute("https://evil.example")).toBe(APP_ROUTE.LIST);
  });

  it("falls back to the general list when next is a protocol-relative URL", () => {
    expect(resolvePostLoginRoute("//evil.example")).toBe(APP_ROUTE.LIST);
  });
});
