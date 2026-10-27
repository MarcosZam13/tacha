// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { Trash2 } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";
import { ICON_SIZE, ICON_STROKE_WIDTH } from "@/constants";
import { Icon } from "../Icon";

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

const BUTTON_NAME = "Eliminar";

const renderInButton = () =>
  render(
    <button type="button" aria-label={BUTTON_NAME}>
      <Icon icon={Trash2} />
    </button>,
  );

describe("Icon (SCRUM-145)", () => {
  it("is hidden from assistive technology", () => {
    const { container } = renderInButton();

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("does not change the accessible name of the button around it", () => {
    renderInButton();

    expect(screen.getByRole("button")).toHaveAccessibleName(BUTTON_NAME);
  });

  it("uses the shared stroke width", () => {
    const { container } = renderInButton();

    expect(container.querySelector("svg")).toHaveAttribute("stroke-width", String(ICON_STROKE_WIDTH));
  });

  it("is medium by default and follows the size prop", () => {
    const { container, rerender } = renderInButton();
    expect(container.querySelector("svg")).toHaveClass("h-5", "w-5");

    rerender(
      <button type="button" aria-label={BUTTON_NAME}>
        <Icon icon={Trash2} size={ICON_SIZE.SMALL} />
      </button>,
    );
    expect(container.querySelector("svg")).toHaveClass("h-4", "w-4");
  });
});
