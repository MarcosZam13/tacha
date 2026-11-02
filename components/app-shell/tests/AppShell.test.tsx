// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTE } from "@/constants";
import { useUserProfile } from "@/hooks/useUserProfile";
import { AppShell } from "../AppShell";
import { APP_NAV_ITEMS } from "../constants/app-shell.constants";
import { createAppShellPage } from "./AppShell.page";

vi.mock("next/navigation", () => ({ usePathname: vi.fn(), useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: vi.fn() }));
const usePathnameMock = vi.mocked(usePathname);
const useUserProfileMock = vi.mocked(useUserProfile);

beforeEach(() => {
  useUserProfileMock.mockReturnValue({ avatarUrl: null, name: "Ana Pérez" });
});

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

  // SCRUM-53, CA-01: el perfil se alcanza desde el sidebar (desktop) y desde la cabecera (mobile).
  it("links the profile from the sidebar and from the mobile top bar, named after the person", () => {
    const page = renderShellAt(APP_ROUTE.LIST);

    const profileLinks = page.getProfileLinks();
    expect(profileLinks).toHaveLength(2);
    profileLinks.forEach((link) => expect(link).toHaveAttribute("href", APP_ROUTE.PROFILE));
  });

  it("shows the name in the sidebar and only the avatar in the top bar", () => {
    const page = renderShellAt(APP_ROUTE.LIST);

    expect(page.getSidebarProfileName()).toHaveTextContent("Ana Pérez");
    expect(page.getTopBarProfileLink()).not.toHaveTextContent("Ana Pérez");
  });

  it("marks the profile as current on its own route", () => {
    const page = renderShellAt(APP_ROUTE.PROFILE);

    page.getProfileLinks().forEach((link) => expect(link).toHaveAttribute("aria-current", "page"));
  });

  it("falls back to the initials, and to a generic name before the session is known", () => {
    useUserProfileMock.mockReturnValue(null);
    const page = renderShellAt(APP_ROUTE.LIST);

    page.getProfileLinks().forEach((link) => expect(link).toHaveAccessibleName("Mi perfil"));
  });

  // SCRUM-55, CA-01
  it("offers sign out at the bottom of the sidebar", () => {
    const page = renderShellAt(APP_ROUTE.LIST);

    expect(page.getSidebarSignOutButton()).toBeEnabled();
  });

  it("renders the screen inside the only main landmark", () => {
    const page = renderShellAt(APP_ROUTE.LIST);

    expect(page.getMain()).toHaveTextContent(SCREEN_TEXT);
  });
});
