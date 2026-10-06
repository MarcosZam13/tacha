"use client";

import Link from "next/link";
import { Button, Spinner } from "@/components/ui";
import { HOUSEHOLD_JOIN_TEXT, HOUSEHOLD_ROUTE } from "./constants/household.constants";
import { useHouseholdInvitationViewModel } from "./hooks/useHouseholdInvitationViewModel";
import type { HouseholdInvitationProps } from "./models/HouseholdInvitationProps.interface";

// Un enlace con el mismo aspecto que el Button principal: navega, así que es
// un <a> (se puede abrir en otra pestaña y el lector lo anuncia como enlace).
const LINK_BUTTON_CLASS_NAME =
  "self-start rounded-tacha-badge bg-tacha-teal px-4 py-2 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90";

/**
 * Página de una invitación a una familia. Solo presentación: qué texto, botón
 * o enlace se ve lo decide useHouseholdInvitationViewModel. El token nunca se
 * muestra. "use client" porque la sesión vive en el navegador.
 */
export const HouseholdInvitation = ({ token }: HouseholdInvitationProps): React.JSX.Element => {
  const viewModel = useHouseholdInvitationViewModel(token);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 bg-tacha-bg px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-tacha-text">{HOUSEHOLD_JOIN_TEXT.TITLE}</h1>

      {/* Siempre montada, aunque esté vacía, para que el lector de pantalla
          anuncie la confirmación (mismo criterio que Household.tsx). */}
      <p role="status" aria-live="polite" className="font-body text-sm text-tacha-teal">
        {viewModel.statusMessage}
      </p>
      {viewModel.errorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {viewModel.errorMessage}
        </p>
      ) : null}

      {viewModel.isChecking ? <Spinner /> : null}

      {viewModel.description ? (
        <section className="flex flex-col gap-4 rounded-tacha-card border border-tacha-border bg-tacha-surface p-6">
          <p className="font-body text-sm text-tacha-textsec">{viewModel.description}</p>
          {viewModel.showJoinButton ? (
            <div>
              <Button isDisabled={viewModel.isJoining} onClick={viewModel.onJoin}>
                {viewModel.joinLabel}
              </Button>
            </div>
          ) : null}
          {viewModel.showLoginLink ? (
            <Link href={HOUSEHOLD_ROUTE.LOGIN} className={LINK_BUTTON_CLASS_NAME}>
              {HOUSEHOLD_JOIN_TEXT.LOGIN}
            </Link>
          ) : null}
        </section>
      ) : null}

      {viewModel.showHouseholdLink ? (
        <Link href={HOUSEHOLD_ROUTE.HOUSEHOLD} className={LINK_BUTTON_CLASS_NAME}>
          {HOUSEHOLD_JOIN_TEXT.GO_TO_HOUSEHOLD}
        </Link>
      ) : null}
    </main>
  );
};
