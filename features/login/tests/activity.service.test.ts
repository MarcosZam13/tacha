import { beforeEach, describe, expect, it } from "vitest";
import { INACTIVITY } from "../constants/login.constants";
import { clearLastActivity, readLastActivity, recordActivity } from "../services/activity.service";

// En Node no existe `window`: el servicio cae a su respaldo en memoria, que es lo que se prueba acá.
const START = 1_000_000;

describe("activity.service", () => {
  beforeEach(() => {
    clearLastActivity();
  });

  it("uses now when no activity was recorded, so a session without history is not expired", () => {
    expect(readLastActivity(START)).toBe(START);
  });

  it("returns the last recorded activity", () => {
    recordActivity(START);

    expect(readLastActivity(START + 5_000)).toBe(START);
  });

  it("never returns a time later than now (the clock was ahead and got corrected)", () => {
    recordActivity(START + 60_000);

    expect(readLastActivity(START)).toBe(START);
  });

  it("ignores records that arrive within the throttle interval", () => {
    recordActivity(START);
    recordActivity(START + INACTIVITY.RECORD_THROTTLE_MS - 1);

    expect(readLastActivity(START + 10_000)).toBe(START);
  });

  it("records again once the throttle interval has passed", () => {
    recordActivity(START);
    recordActivity(START + INACTIVITY.RECORD_THROTTLE_MS);

    expect(readLastActivity(START + 10_000)).toBe(START + INACTIVITY.RECORD_THROTTLE_MS);
  });

  it("forgets the activity when cleared, and lets the next one be recorded right away", () => {
    recordActivity(START);
    clearLastActivity();
    recordActivity(START + 1);

    expect(readLastActivity(START + 10_000)).toBe(START + 1);
  });
});
