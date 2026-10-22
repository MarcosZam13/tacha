// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { AUTH_ROUTE } from "@/constants";
import { getSafeReturnPath, readReturnPathFromUrl, toLoginRoute } from "../returnPath.utils";

describe("toLoginRoute", () => {
  it("adds the return path as the next parameter of the login route", () => {
    expect(toLoginRoute("/recetas")).toBe("/login?next=%2Frecetas");
  });

  it("encodes characters that would otherwise start another parameter", () => {
    expect(toLoginRoute("/lista?vista=compra&x=1")).toBe("/login?next=%2Flista%3Fvista%3Dcompra%26x%3D1");
  });
});

describe("getSafeReturnPath", () => {
  it("keeps an internal path of the app", () => {
    expect(getSafeReturnPath("/invitacion/0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0")).toBe(
      "/invitacion/0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0",
    );
  });

  it("keeps the query string of an internal path", () => {
    expect(getSafeReturnPath("/recetas?id=7")).toBe("/recetas?id=7");
  });

  it("rejects an absolute URL to another site", () => {
    expect(getSafeReturnPath("https://evil.example")).toBeUndefined();
  });

  it("rejects a protocol-relative URL that the browser reads as another site", () => {
    expect(getSafeReturnPath("//evil.example")).toBeUndefined();
  });

  it("rejects a backslash variant that some browsers read as another site", () => {
    expect(getSafeReturnPath("/\\evil.example")).toBeUndefined();
  });

  it("rejects a path that carries a scheme", () => {
    expect(getSafeReturnPath("/javascript:alert(1)")).toBeUndefined();
  });

  it.each([
    ["a tab", "/\t/evil.example"],
    ["a newline", "/\n/evil.example"],
    ["a carriage return", "/\r/evil.example"],
  ])("rejects %s after the first slash, which the browser strips and reads as another site", (_, candidate) => {
    expect(getSafeReturnPath(candidate)).toBeUndefined();
  });

  it("returns the path as the browser resolves it, without the stripped characters", () => {
    expect(getSafeReturnPath("/rece\ttas")).toBe("/recetas");
  });

  it.each([
    "/a/..//evil.example",
    "/a/..///evil.example",
    "/a/%2e%2e//evil.example",
    "/a/.%2e//evil.example",
    "/a/\t..//evil.example",
    "/recetas\\..\\..\\/evil.example",
    "/a\\..\\/evil.example",
  ])("rejects %j, whose dot segments resolve to another site", (candidate) => {
    expect(getSafeReturnPath(candidate)).toBeUndefined();
  });

  it("returns undefined instead of throwing when the path resolves to an invalid URL", () => {
    expect(getSafeReturnPath("/\t/a b")).toBeUndefined();
  });

  it("keeps a path whose dot segments stay inside the app", () => {
    expect(getSafeReturnPath("/a/../recetas")).toBe("/recetas");
  });

  it("never returns a path that the browser would read as another site", () => {
    const tricky = ["/a/..//x.example", "/\t/x.example", "/./\\x.example", "/%2e%2e//x.example", "/a/b/../../..//x.example"];
    const base = "http://tacha.invalid";

    tricky.forEach((candidate) => {
      const result = getSafeReturnPath(candidate);
      if (result !== undefined) expect(new URL(result, base).origin).toBe(base);
    });
  });

  it("rejects the login itself so the user does not loop back to it", () => {
    expect(getSafeReturnPath(`${AUTH_ROUTE.LOGIN}?next=%2Flista`)).toBeUndefined();
  });

  it("returns undefined when there is no return path", () => {
    expect(getSafeReturnPath(undefined)).toBeUndefined();
  });

  it("returns undefined for an empty return path", () => {
    expect(getSafeReturnPath("")).toBeUndefined();
  });
});

describe("readReturnPathFromUrl", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("reads the decoded next parameter of the current URL", () => {
    window.history.replaceState(null, "", "/login?next=%2Finvitacion%2Fabc");

    expect(readReturnPathFromUrl()).toBe("/invitacion/abc");
  });

  it("returns undefined when the URL has no next parameter", () => {
    window.history.replaceState(null, "", "/login");

    expect(readReturnPathFromUrl()).toBeUndefined();
  });
});
