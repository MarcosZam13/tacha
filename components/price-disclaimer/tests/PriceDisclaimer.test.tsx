// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PriceDisclaimer } from "../PriceDisclaimer";
import { createPriceDisclaimerPage } from "./PriceDisclaimer.page";

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

describe("PriceDisclaimer", () => {
  it("shows the approved title and text (CA-03)", () => {
    render(<PriceDisclaimer />);
    const page = createPriceDisclaimerPage();

    // Textos literales a propósito: fijan lo que aprobó la dueña de la historia
    // (SPEC regla 1) aunque alguien cambie la constante por error.
    expect(page.getDisclaimer()).toHaveTextContent("Precios estimados");
    expect(page.getDisclaimer()).toHaveTextContent(
      "Los precios son aproximados y pueden variar según el supermercado. Tacha no está afiliado a ningún supermercado.",
    );
  });

  it("is an aside named after its title, so screen readers can find it (SPEC §9)", () => {
    render(<PriceDisclaimer />);
    const page = createPriceDisclaimerPage();

    expect(page.getDisclaimer().tagName).toBe("ASIDE");
    expect(page.getDisclaimer()).toHaveAccessibleName("Precios estimados");
  });

  it("does not interrupt: no alert or status role (CA-02)", () => {
    render(<PriceDisclaimer />);
    const page = createPriceDisclaimerPage();

    expect(page.getDisclaimer()).not.toHaveAttribute("role", "alert");
    expect(page.getDisclaimer()).not.toHaveAttribute("aria-live");
    expect(page.queryAlertsInside()).toHaveLength(0);
    expect(page.queryStatusInside()).toHaveLength(0);
  });

  it("cannot be closed: it has no buttons (CA-01)", () => {
    render(<PriceDisclaimer />);
    const page = createPriceDisclaimerPage();

    expect(page.queryButtonsInside()).toHaveLength(0);
  });

  it("stays in the normal page flow, never floating over content (CA-02)", () => {
    render(<PriceDisclaimer />);
    const page = createPriceDisclaimerPage();

    expect(page.getDisclaimer().className).not.toMatch(/\b(fixed|absolute|sticky)\b/u);
  });
});
