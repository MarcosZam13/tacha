import { describe, expect, it } from "vitest";
import { isPublicRoute } from "../utils/isPublicRoute";

describe("isPublicRoute", () => {
  it.each(["/", "/login", "/registro", "/recuperar-contrasena"])("lets %s be seen without a session", (path) => {
    expect(isPublicRoute(path)).toBe(true);
  });

  it.each(["/lista", "/recetas", "/ruta-que-no-existe"])("protects %s (a route not in the list fails closed)", (path) => {
    expect(isPublicRoute(path)).toBe(false);
  });
});
