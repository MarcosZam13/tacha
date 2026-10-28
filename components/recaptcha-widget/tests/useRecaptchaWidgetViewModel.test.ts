// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RECAPTCHA } from "@/constants";
import { useRecaptchaWidgetViewModel } from "../hooks/useRecaptchaWidgetViewModel";
import type { RecaptchaWindow } from "../models/RecaptchaWindow.interface";

// La clave del sitio se lee de @/constants; cada prueba elige la suya.
const claveDelSitio = vi.hoisted(() => ({ valor: "clave-de-prueba" }));
vi.mock("@/constants", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/constants")>();
  return {
    ...real,
    get RECAPTCHA_SITE_KEY() {
      return claveDelSitio.valor;
    },
  };
});

// Monta el hook con un contenedor real, como lo hace RecaptchaWidget con su <div ref>.
const renderWidget = () =>
  renderHook(() => {
    const viewModel = useRecaptchaWidgetViewModel({ onTokenChange: vi.fn(), resetCount: 0 });
    if (!viewModel.containerRef.current) viewModel.containerRef.current = document.createElement("div");
    return viewModel;
  });

describe("useRecaptchaWidgetViewModel (SCRUM-137, F3)", () => {
  beforeEach(() => {
    claveDelSitio.valor = "clave-de-prueba";
    document.getElementById(RECAPTCHA.SCRIPT_ID)?.remove();
  });

  afterEach(() => {
    cleanup();
    delete (window as RecaptchaWindow).grecaptcha;
  });

  it("shows the load error when the site key is missing", () => {
    claveDelSitio.valor = "";

    const { result } = renderWidget();

    expect(result.current.hasLoadError).toBe(true);
  });

  it("does not request Google's script when the site key is missing", () => {
    claveDelSitio.valor = "";

    renderWidget();

    expect(document.getElementById(RECAPTCHA.SCRIPT_ID)).toBeNull();
  });

  it("shows the load error instead of throwing when Google rejects the render", () => {
    (window as RecaptchaWindow).grecaptcha = {
      ready: (callback: () => void) => callback(),
      render: () => {
        throw new Error("Missing required parameters: sitekey");
      },
      reset: vi.fn(),
    } as unknown as RecaptchaWindow["grecaptcha"];

    const { result, rerender } = renderWidget();
    rerender();

    expect(result.current.hasLoadError).toBe(true);
  });

  it("has no load error with a site key while the script is still loading", () => {
    const { result } = renderWidget();

    expect(result.current.hasLoadError).toBe(false);
  });
});
