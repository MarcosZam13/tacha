// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CHIP_TONE } from "@/constants";
import { Chip } from "../Chip";

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

const LABEL = "Sin total";

describe("Chip", () => {
  it("shows its text", () => {
    render(<Chip>{LABEL}</Chip>);

    expect(screen.getByText(LABEL)).toBeInTheDocument();
  });

  it.each([
    [CHIP_TONE.NEUTRAL, "text-tacha-text"],
    [CHIP_TONE.TEAL, "text-tacha-teal"],
    [CHIP_TONE.TERRACOTTA, "text-tacha-terracotta"],
  ])("keeps the %s tone as it was", (tone, textClass) => {
    render(<Chip tone={tone}>{LABEL}</Chip>);

    expect(screen.getByText(LABEL)).toHaveClass(textClass);
  });

  it("gives the strong terracotta tone the terracotta background and border with the AA text (SCRUM-92, D27)", () => {
    render(<Chip tone={CHIP_TONE.TERRACOTTA_STRONG}>{LABEL}</Chip>);

    const chip = screen.getByText(LABEL);
    expect(chip).toHaveClass("bg-tacha-terracotta/10", "border-tacha-terracotta", "text-tacha-terracotta-text");
    expect(chip).not.toHaveClass("text-tacha-terracotta");
  });
});

// ----------------------------------------------------------------------------
// Contraste del tono fuerte con los tokens reales de app/globals.css (WCAG 2.x).
// El fondo del chip es el terracota al 10 % sobre surface o bg: se prueba el peor.
// ----------------------------------------------------------------------------

const AA_NORMAL_TEXT = 4.5;
const CHIP_BACKGROUND_ALPHA = 0.1;
const GLOBALS_CSS = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

// El bloque de un selector, sin los anidados (media query).
const readTokens = (selector: string): Record<string, string> => {
  const start = GLOBALS_CSS.indexOf(`${selector} {`);
  const block = GLOBALS_CSS.slice(start, GLOBALS_CSS.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--(tacha-[a-z-]+):\s*(#[0-9a-f]{6})/giu)].map(([, name, value]) => [name, value]));
};

type Rgb = [number, number, number];

const toRgb = (hex: string): Rgb => [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)) as Rgb;

const toLuminance = (color: Rgb): number => {
  const [red, green, blue] = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const toContrast = (first: Rgb, second: Rgb): number => {
  const [lighter, darker] = [toLuminance(first), toLuminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

const blend = (foreground: Rgb, background: Rgb, alpha: number): Rgb =>
  foreground.map((channel, index) => Math.round(alpha * channel + (1 - alpha) * background[index])) as Rgb;

const worstChipContrast = (tokens: Record<string, string>, textToken: string): number => {
  const terracotta = toRgb(tokens["tacha-terracotta"]);
  return Math.min(
    ...[tokens["tacha-surface"], tokens["tacha-bg"]].map((under) =>
      toContrast(toRgb(tokens[textToken]), blend(terracotta, toRgb(under), CHIP_BACKGROUND_ALPHA)),
    ),
  );
};

describe("Chip strong terracotta contrast (SCRUM-92, D27)", () => {
  it.each([
    ["light", ":root"],
    ["dark", ':root[data-theme="dark"]'],
  ])("reaches WCAG AA in the %s theme", (_, selector) => {
    const tokens = readTokens(selector);

    expect(worstChipContrast(tokens, "tacha-terracotta-text")).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it("uses the same token values in the dark media query and the dark theme", () => {
    expect(GLOBALS_CSS.match(/--tacha-terracotta-text:\s*#e89a6c/giu)).toHaveLength(2);
  });

  it("is needed: the usual terracotta text does not reach AA in the light theme", () => {
    expect(worstChipContrast(readTokens(":root"), "tacha-terracotta")).toBeLessThan(AA_NORMAL_TEXT);
  });
});
