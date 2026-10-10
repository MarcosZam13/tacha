import { beforeEach, describe, expect, it } from "vitest";
import { consumeInactivityNotice, markInactivityLogout } from "../services/inactivity-notice.service";

// En Node no existe `window`: el servicio cae a su bandera en memoria, que es lo que se prueba acá.
describe("inactivity-notice.service", () => {
  beforeEach(() => {
    consumeInactivityNotice();
  });

  it("has no pending notice by default", () => {
    expect(consumeInactivityNotice()).toBe(false);
  });

  it("reports a pending notice after an inactivity logout", () => {
    markInactivityLogout();

    expect(consumeInactivityNotice()).toBe(true);
  });

  it("shows the notice only once", () => {
    markInactivityLogout();
    consumeInactivityNotice();

    expect(consumeInactivityNotice()).toBe(false);
  });
});
