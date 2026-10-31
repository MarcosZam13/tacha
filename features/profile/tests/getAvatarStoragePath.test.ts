import { describe, expect, it } from "vitest";
import { getAvatarStoragePath } from "../utils/getAvatarStoragePath";

const PUBLIC_BASE_URL = "https://proyecto.supabase.co/storage/v1/object/public/avatars";

describe("getAvatarStoragePath", () => {
  it("takes the object path out of the public URL", () => {
    expect(getAvatarStoragePath(`${PUBLIC_BASE_URL}/user-1/foto.png`)).toBe("user-1/foto.png");
  });

  it("ignores the query parameters of the URL", () => {
    expect(getAvatarStoragePath(`${PUBLIC_BASE_URL}/user-1/foto.png?t=123`)).toBe("user-1/foto.png");
  });

  it("returns null without a URL", () => {
    expect(getAvatarStoragePath(null)).toBeNull();
  });

  // Un avatar_url editado a mano a otro sitio no debe convertirse en un borrado en el bucket.
  it("returns null for a URL that is not from the avatars bucket", () => {
    expect(getAvatarStoragePath("https://otro-sitio.com/foto.png")).toBeNull();
  });

  it("returns null when the URL has no path after the bucket", () => {
    expect(getAvatarStoragePath(`${PUBLIC_BASE_URL}/`)).toBeNull();
  });
});
