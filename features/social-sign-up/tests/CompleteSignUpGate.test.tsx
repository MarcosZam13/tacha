// @vitest-environment jsdom
import type { Session } from "@supabase/supabase-js";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_ROUTE, USER_METADATA_KEY } from "@/constants";
import { subscribeToSessionChanges } from "@/services/session.service";
import type { NullableRef } from "@/types/nullable.types";
import { CompleteSignUpGate } from "../CompleteSignUpGate";
import { COMPLETE_SIGN_UP_GATE_TIMEOUT_MS } from "../constants/complete-sign-up.constants";
import { SOCIAL_PROVIDER, SOCIAL_SIGN_UP_COMPLETED_KEY } from "../constants/social-sign-up.constants";
import { createCompleteSignUpGatePage } from "./CompleteSignUpGate.page";

const { router } = vi.hoisted(() => ({ router: { replace: vi.fn() } }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/services/session.service", () => ({ subscribeToSessionChanges: vi.fn() }));
const subscribeMock = vi.mocked(subscribeToSessionChanges);

const PRIVATE_CONTENT = "Tu lista";

interface RenderedGate {
  /** Entrega una sesión como lo haría onAuthStateChange. */
  notify: (session: NullableRef<Session>) => void;
  page: ReturnType<typeof createCompleteSignUpGatePage>;
  unmount: () => void;
  unsubscribe: ReturnType<typeof vi.fn>;
}

/** Monta la puerta sin entregar todavía ninguna sesión. */
const renderGate = (): RenderedGate => {
  let notifySubscriber: (session: NullableRef<Session>) => void = () => undefined;
  const unsubscribe = vi.fn();
  subscribeMock.mockImplementation((onChange) => {
    notifySubscriber = onChange;
    return unsubscribe;
  });
  const { unmount } = render(
    <CompleteSignUpGate>
      <p>{PRIVATE_CONTENT}</p>
    </CompleteSignUpGate>,
  );

  return {
    notify: (session) => act(() => notifySubscriber(session)),
    page: createCompleteSignUpGatePage(PRIVATE_CONTENT),
    unmount,
    unsubscribe,
  };
};

const createSession = (provider: string, userMetadata: Record<string, string> = {}): Session =>
  ({
    user: { app_metadata: { provider }, email: "ana@correo.com", is_anonymous: false, user_metadata: userMetadata },
  }) as unknown as Session;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
beforeEach(() => {
  vi.clearAllMocks();
});

describe("CompleteSignUpGate", () => {
  it("shows a spinner and no private content while the session is being checked", () => {
    const { page } = renderGate();

    expect(page.querySpinner()).toBeInTheDocument();
    expect(page.queryPrivateContent()).not.toBeInTheDocument();
  });

  // SCRUM-43, CA-06
  it("sends a social account that has not completed its sign up to the form", () => {
    const { notify, page } = renderGate();

    notify(createSession(SOCIAL_PROVIDER.GOOGLE));

    expect(router.replace).toHaveBeenCalledWith(AUTH_ROUTE.COMPLETE_SIGN_UP);
    expect(page.queryPrivateContent()).not.toBeInTheDocument();
  });

  it("shows the private screen to a social account that completed its sign up", () => {
    const { notify, page } = renderGate();

    notify(createSession(SOCIAL_PROVIDER.FACEBOOK, { [SOCIAL_SIGN_UP_COMPLETED_KEY]: "2026-11-16", [USER_METADATA_KEY.TERMS_ACCEPTED_AT]: "2026-11-16" }));

    expect(page.queryPrivateContent()).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("shows the private screen to an email account", () => {
    const { notify, page } = renderGate();

    notify(createSession("email"));

    expect(page.queryPrivateContent()).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  // El guard de sesión decide qué pasa sin sesión; esta puerta no redirige a nadie más.
  it("shows the private screen without a session", () => {
    const { notify, page } = renderGate();

    notify(null);

    expect(page.queryPrivateContent()).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("opens as soon as the form saves the completed mark", () => {
    const { notify, page } = renderGate();
    notify(createSession(SOCIAL_PROVIDER.GOOGLE));
    expect(page.queryPrivateContent()).not.toBeInTheDocument();

    notify(createSession(SOCIAL_PROVIDER.GOOGLE, { [SOCIAL_SIGN_UP_COMPLETED_KEY]: "2026-11-16", [USER_METADATA_KEY.TERMS_ACCEPTED_AT]: "2026-11-16" }));

    expect(page.queryPrivateContent()).toBeInTheDocument();
  });

  it("opens if the session never arrives, instead of leaving the screen blank", () => {
    vi.useFakeTimers();
    const { page } = renderGate();

    act(() => vi.advanceTimersByTime(COMPLETE_SIGN_UP_GATE_TIMEOUT_MS));

    expect(page.queryPrivateContent()).toBeInTheDocument();
  });

  it("stops listening to the session when it leaves the screen", () => {
    const { unmount, unsubscribe } = renderGate();

    unmount();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
