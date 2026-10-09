// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTE } from "@/constants";
import { AppShell } from "../AppShell";
import { APP_NAV_ITEMS } from "../constants/app-shell.constants";
import { createAppShellPage } from "./AppShell.page";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
const usePathnameMock = vi.mocked(usePathname);

const SCREEN_TEXT = "Contenido de la pantalla";

// Sin globals de Vitest, Testing Library no limpia el DOM sola entre tests.
afterEach(cleanup);

const renderShellAt = (pathname: string): ReturnType<typeof createAppShellPage> => {
  usePathnameMock.mockReturnValue(pathname);
  render(
    <AppShell>
      <p>{SCREEN_TEXT}</p>
    </AppShell>,
  );
  return createAppShellPage();
};

describe("AppShell", () => {
  it("links every section from both the sidebar and the tab bar", () => {
    const page = renderShellAt(APP_ROUTE.LIST);

    const navigations = page.getNavigations();
    expect(navigations).toHaveLength(2);
    navigations.forEach((navigation) => {
      APP_NAV_ITEMS.forEach((item) => {
        expect(page.getLink(navigation, item.label)).toHaveAttribute("href", item.href);
      });
    });
  });

  it("marks only the current section, in both navigations", () => {
    const page = renderShellAt(APP_ROUTE.CATALOG);

    const currentLinks = page.getCurrentLinks();
    expect(currentLinks).toHaveLength(2);
    currentLinks.forEach((link) => expect(link).toHaveAttribute("href", APP_ROUTE.CATALOG));
  });

  it("keeps the section marked on a subroute", () => {
    const page = renderShellAt(`${APP_ROUTE.RECIPES}/nueva`);

    page.getCurrentLinks().forEach((link) => expect(link).toHaveAttribute("href", APP_ROUTE.RECIPES));
  });

  it("renders the screen inside the only main landmark", () => {
    const page = renderShellAt(APP_ROUTE.LIST);

    expect(page.getMain()).toHaveTextContent(SCREEN_TEXT);
  });
});
