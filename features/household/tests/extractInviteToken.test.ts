import { describe, expect, it } from "vitest";
import { extractInviteToken } from "../utils/extractInviteToken";

// Token inventado con formato de UUID (no es uno real de la base).
const TOKEN = "3f2b8c1e-9a4d-4e7b-8c6f-1a2b3c4d5e6f";

describe("extractInviteToken", () => {
  it("returns the token from a full invitation link", () => {
    expect(extractInviteToken(`https://tacha.app/invitacion/${TOKEN}`)).toBe(TOKEN);
  });

  it("returns the token when only the code is pasted", () => {
    expect(extractInviteToken(TOKEN)).toBe(TOKEN);
  });

  it("ignores spaces and line breaks around the pasted text", () => {
    expect(extractInviteToken(`  ${TOKEN}\n`)).toBe(TOKEN);
  });

  it("accepts a link with a trailing slash, a query or a fragment", () => {
    expect(extractInviteToken(`https://tacha.app/invitacion/${TOKEN}/`)).toBe(TOKEN);
    expect(extractInviteToken(`https://tacha.app/invitacion/${TOKEN}?from=chat`)).toBe(TOKEN);
    expect(extractInviteToken(`https://tacha.app/invitacion/${TOKEN}#top`)).toBe(TOKEN);
  });

  it("accepts a link without protocol", () => {
    expect(extractInviteToken(`localhost:3000/invitacion/${TOKEN}`)).toBe(TOKEN);
  });

  it("accepts uppercase and returns the token in lowercase", () => {
    expect(extractInviteToken(TOKEN.toUpperCase())).toBe(TOKEN);
    expect(extractInviteToken(`https://tacha.app/invitacion/${TOKEN.toUpperCase()}`)).toBe(TOKEN);
  });

  it("returns null for empty or blank text", () => {
    expect(extractInviteToken("")).toBeNull();
    expect(extractInviteToken("   ")).toBeNull();
  });

  it("returns null for text without a token", () => {
    expect(extractInviteToken("hola")).toBeNull();
    expect(extractInviteToken("https://tacha.app/household")).toBeNull();
  });

  it("returns null for a malformed UUID", () => {
    // Un carácter de menos, y una "g" que no es hexadecimal.
    expect(extractInviteToken(TOKEN.slice(0, -1))).toBeNull();
    expect(extractInviteToken(`g${TOKEN.slice(1)}`)).toBeNull();
    expect(extractInviteToken(`https://tacha.app/invitacion/${TOKEN}x`)).toBeNull();
  });

  it("returns null for a UUID that is not in the invitation path", () => {
    expect(extractInviteToken(`https://tacha.app/recetas/${TOKEN}/editar`)).toBeNull();
  });
});
