import { afterEach, describe, expect, it, vi } from "vitest";
import { UNSAVED_CHANGES_SOURCE } from "@/constants";
import {
  hasUnsavedChanges,
  setUnsavedChanges,
  subscribeToUnsavedChanges,
} from "../unsaved-changes.service";

// El estado vive en el módulo: se deja limpio entre tests.
afterEach(() => setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, false));

describe("unsaved changes service", () => {
  it("starts without unsaved changes", () => {
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("reports unsaved changes once a screen marks them, and none after it retires them", () => {
    setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, true);
    expect(hasUnsavedChanges()).toBe(true);

    setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, false);
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("tells subscribers when the answer changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToUnsavedChanges(listener);

    setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, true);
    setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, false);

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("does not notify when nothing changed", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToUnsavedChanges(listener);

    setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, false);
    setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, true);
    setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, true);

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("stops notifying after unsubscribing", () => {
    const listener = vi.fn();
    subscribeToUnsavedChanges(listener)();

    setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, true);

    expect(listener).not.toHaveBeenCalled();
  });
});
