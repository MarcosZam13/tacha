// @vitest-environment jsdom
import type { Session } from "@supabase/supabase-js";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTE, AUTH_ROUTE } from "@/constants";
import { subscribeToSessionChanges } from "@/services/session.service";
import type { NullableRef } from "@/types/nullable.types";
import { PublicNavbarCta } from "../components/PublicNavbarCta";
import { LANDING_ROUTE } from "../constants/landing.constants";
import { createPublicNavbarCtaPage } from "./PublicNavbarCta.page";

vi.mock("@/services/session.service", () => ({ subscribeToSessionChanges: vi.fn() }));
const subscribeMock = vi.mocked(subscribeToSessionChanges);

// Sin globals de Vitest, Testing Library no limpia el DOM sola entre tests.
afterEach(cleanup);

interface RenderedNavbar {
  /** Entrega una sesión como lo haría onAuthStateChange. */
  notify: (session: NullableRef<Session>) => void;
  page: ReturnType<typeof createPublicNavbarCtaPage>;
}

/** Monta los botones sin entregar todavía ninguna sesión: la verificación sigue en curso. */
const renderNavbar = (): RenderedNavbar => {
  let notifySubscriber: (session: NullableRef<Session>) => void = () => undefined;
  subscribeMock.mockImplementation((onChange) => {
    notifySubscriber = onChange;
    return () => undefined;
  });
  render(<PublicNavbarCta />);

  return {
    notify: (session) => act(() => notifySubscriber(session)),
    page: createPublicNavbarCtaPage(),
  };
};

/** Monta los botones y entrega la sesión como lo haría onAuthStateChange (INITIAL_SESSION). */
const renderWithSession = (session: NullableRef<Session>): ReturnType<typeof createPublicNavbarCtaPage> => {
  const { notify, page } = renderNavbar();
  notify(session);
  return page;
};

const createSession = (isAnonymous: boolean): Session =>
  ({ user: { is_anonymous: isAnonymous } }) as unknown as Session;

describe("PublicNavbarCta", () => {
  it("invites a visitor without a session to register", () => {
    const page = renderWithSession(null);

    expect(page.getRegisterLink()).toHaveAttribute("href", LANDING_ROUTE.REGISTER);
  });

  // SCRUM-159, CA-01 y CA-02
  it("offers a visitor without a session to sign in", () => {
    const page = renderWithSession(null);

    expect(page.getLoginLink()).toHaveAttribute("href", AUTH_ROUTE.LOGIN);
  });

  // SCRUM-159: mientras se verifica la sesión se ve lo del visitante, sin saltos.
  it("shows the visitor buttons while the session is still being checked", () => {
    const { page } = renderNavbar();

    expect(page.getLoginLink()).toBeInTheDocument();
    expect(page.getRegisterLink()).toBeInTheDocument();
  });

  // SCRUM-159, CA-04
  it("treats an anonymous session as a visitor", () => {
    const page = renderWithSession(createSession(true));

    expect(page.getRegisterLink()).toBeInTheDocument();
    expect(page.getLoginLink()).toBeInTheDocument();
  });

  // SCRUM-159, CA-03
  it("takes a registered user into the app instead of offering to register or sign in", () => {
    const page = renderWithSession(createSession(false));

    expect(page.getGoToAppLink()).toHaveAttribute("href", APP_ROUTE.LIST);
    expect(page.queryRegisterLink()).not.toBeInTheDocument();
    expect(page.queryLoginLink()).not.toBeInTheDocument();
  });

  // SCRUM-159: cerrar sesión en otra pestaña con la landing abierta.
  it("offers to sign in again when the registered session ends", () => {
    const { notify, page } = renderNavbar();
    notify(createSession(false));

    notify(null);

    expect(page.getLoginLink()).toBeInTheDocument();
    expect(page.queryGoToAppLink()).not.toBeInTheDocument();
  });
});
