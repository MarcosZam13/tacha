import { describe, expect, it } from "vitest";
import { toUserProfile } from "../toUserProfile";

describe("toUserProfile", () => {
  it("reads the name and the photo from the user metadata", () => {
    expect(toUserProfile({ user_metadata: { avatar_url: "https://x.co/a.png", name: "Ana" } })).toEqual({
      avatarUrl: "https://x.co/a.png",
      name: "Ana",
    });
  });

  it("trims the name", () => {
    expect(toUserProfile({ user_metadata: { name: "  Ana  " } }).name).toBe("Ana");
  });

  it("returns null for what the account does not have", () => {
    expect(toUserProfile({ user_metadata: {} })).toEqual({ avatarUrl: null, name: null });
  });

  // El metadata lo escribe el cliente: un valor de otro tipo o vacío no puede llegar a la pantalla como texto.
  it.each([[42], [true], [{ nested: "x" }], [""], ["   "]])("ignores the value %j", (value) => {
    expect(toUserProfile({ user_metadata: { avatar_url: value, name: value } })).toEqual({
      avatarUrl: null,
      name: null,
    });
  });
});
