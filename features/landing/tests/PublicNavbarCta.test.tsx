// @vitest-environment jsdom
import type { Session } from "@supabase/supabase-js";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTE } from "@/constants";
import { subscribeToSessionChanges } from "@/services/session.service";
import type { NullableRef } from "@/types/nullable.types";
import { PublicNavbarCta } from "../components/PublicNavbarCta";
import { LANDING_ROUTE, NAVBAR_TEXT } from "../constants/landing.constants";

vi.mock("@/services/session.service", () => ({ subscribeToSessionChanges: vi.fn() }));
const subscribeMock = vi.mocked(subscribeToSessionChanges);

// Sin globals de Vitest, Testing Library no limpia el DOM sola entre tests.
afterEach(cleanup);

/** Monta el botón y entrega la sesión como lo haría onAuthStateChange (INITIAL_SESSION). */
const renderWithSession = (session: NullableRef<Session>): void => {
  let notify: (nextSession: NullableRef<Session>) => void = () => undefined;
  subscribeMock.mockImplementation((onChange) => {
    notify = onChange;
    return () => undefined;
  });
  render(<PublicNavbarCta />);
  act(() => notify(session));
};

const createSession = (isAnonymous: boolean): Session =>
  ({ user: { is_anonymous: isAnonymous } }) as unknown as Session;

describe("PublicNavbarCta", () => {
  it("invites a visitor without a session to register", () => {
    renderWithSession(null);

    expect(screen.getByRole("link", { name: NAVBAR_TEXT.REGISTER })).toHaveAttribute("href", LANDING_ROUTE.REGISTER);
  });

  it("treats an anonymous session as a visitor", () => {
    renderWithSession(createSession(true));

    expect(screen.getByRole("link", { name: NAVBAR_TEXT.REGISTER })).toBeInTheDocument();
  });

  it("takes a registered user into the app instead of offering to register", () => {
    renderWithSession(createSession(false));

    expect(screen.getByRole("link", { name: NAVBAR_TEXT.GO_TO_APP })).toHaveAttribute("href", APP_ROUTE.LIST);
    expect(screen.queryByRole("link", { name: NAVBAR_TEXT.REGISTER })).not.toBeInTheDocument();
  });
});
