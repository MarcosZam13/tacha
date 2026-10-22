// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REGISTRO_ERROR_MESSAGE, REGISTRO_FIELD } from "../constants/registro.constants";
import { useRegistroManualViewModel } from "../hooks/useRegistroManualViewModel";

// Sin Supabase real: el registro no se envía en estas pruebas.
vi.mock("../services/registro.service", () => ({ registerUser: vi.fn() }));

// Sin globals de Vitest, Testing Library no desmonta solo entre tests.
afterEach(cleanup);

describe("useRegistroManualViewModel: errores al salir del campo (SCRUM-137, F5)", () => {
  it("shows the required error when the user leaves the name empty", () => {
    const { result } = renderHook(() => useRegistroManualViewModel());

    act(() => result.current.handleBlur(REGISTRO_FIELD.NAME)());

    expect(result.current.errors[REGISTRO_FIELD.NAME]).toBe(REGISTRO_ERROR_MESSAGE.NAME_REQUIRED);
  });

  it("does not mark fields the user has not left yet", () => {
    const { result } = renderHook(() => useRegistroManualViewModel());

    act(() => result.current.handleBlur(REGISTRO_FIELD.NAME)());

    expect(result.current.errors[REGISTRO_FIELD.EMAIL]).toBeUndefined();
  });

  it("shows the format error when the user leaves an invalid email", () => {
    const { result } = renderHook(() => useRegistroManualViewModel());

    act(() => result.current.handleChange(REGISTRO_FIELD.EMAIL)("sin-arroba"));
    act(() => result.current.handleBlur(REGISTRO_FIELD.EMAIL)());

    expect(result.current.errors[REGISTRO_FIELD.EMAIL]).toBe(REGISTRO_ERROR_MESSAGE.EMAIL_INVALID);
  });

  it("shows no error when the user leaves a valid field", () => {
    const { result } = renderHook(() => useRegistroManualViewModel());

    act(() => result.current.handleChange(REGISTRO_FIELD.NAME)("Marcos"));
    act(() => result.current.handleBlur(REGISTRO_FIELD.NAME)());

    expect(result.current.errors[REGISTRO_FIELD.NAME]).toBeUndefined();
  });

  it("clears the error as soon as the user types in the field again", () => {
    const { result } = renderHook(() => useRegistroManualViewModel());

    act(() => result.current.handleBlur(REGISTRO_FIELD.NAME)());
    act(() => result.current.handleChange(REGISTRO_FIELD.NAME)("M"));

    expect(result.current.errors[REGISTRO_FIELD.NAME]).toBeUndefined();
  });
});
