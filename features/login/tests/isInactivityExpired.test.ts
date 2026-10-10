import { describe, expect, it } from "vitest";
import { INACTIVITY } from "../constants/login.constants";
import { isInactivityExpired } from "../utils/isInactivityExpired";

const LIMIT_MINUTES = 30;
const LIMIT_MS = LIMIT_MINUTES * INACTIVITY.MS_PER_MINUTE;
const LAST_ACTIVITY = 1_000_000;

describe("isInactivityExpired", () => {
  it("is not expired right after the last activity", () => {
    expect(isInactivityExpired(LAST_ACTIVITY, LAST_ACTIVITY, LIMIT_MINUTES)).toBe(false);
  });

  it("is not expired one millisecond before the limit", () => {
    expect(isInactivityExpired(LAST_ACTIVITY + LIMIT_MS - 1, LAST_ACTIVITY, LIMIT_MINUTES)).toBe(
      false,
    );
  });

  it("is expired exactly at the limit", () => {
    expect(isInactivityExpired(LAST_ACTIVITY + LIMIT_MS, LAST_ACTIVITY, LIMIT_MINUTES)).toBe(true);
  });

  it("is expired well past the limit", () => {
    expect(isInactivityExpired(LAST_ACTIVITY + LIMIT_MS * 3, LAST_ACTIVITY, LIMIT_MINUTES)).toBe(
      true,
    );
  });

  it("never expires when the last activity is in the future (clock moved back)", () => {
    expect(isInactivityExpired(LAST_ACTIVITY, LAST_ACTIVITY + LIMIT_MS * 2, LIMIT_MINUTES)).toBe(
      false,
    );
  });
});
