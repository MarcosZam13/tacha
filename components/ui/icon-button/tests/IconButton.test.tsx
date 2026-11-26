// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Trash2 } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ICON_BUTTON_TONE } from "@/constants";
import { IconButton } from "../IconButton";

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

const LABEL = "Eliminar";

describe("IconButton (SCRUM-158)", () => {
  it("is named by its label, not by the icon", () => {
    const { container } = render(<IconButton icon={Trash2} label={LABEL} onClick={vi.fn()} />);

    expect(screen.getByRole("button")).toHaveAccessibleName(LABEL);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("calls onClick when pressed", () => {
    const onClick = vi.fn();
    render(<IconButton icon={Trash2} label={LABEL} onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: LABEL }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(<IconButton icon={Trash2} label={LABEL} isDisabled onClick={onClick} />);

    const button = screen.getByRole("button", { name: LABEL });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("paints destructive actions with the danger color", () => {
    render(<IconButton icon={Trash2} label={LABEL} tone={ICON_BUTTON_TONE.DANGER} onClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: LABEL }).className).toContain("text-tacha-danger");
  });
});
