"use client";

import { Button, Spinner } from "@/components/ui";
import { HouseholdCreateForm } from "./components/HouseholdCreateForm";
import { HouseholdInviteLinkCard } from "./components/HouseholdInviteLinkCard";
import { HouseholdJoinForm } from "./components/HouseholdJoinForm";
import { HOUSEHOLD_INVITE_TEXT, HOUSEHOLD_TEXT } from "./constants/household.constants";
import { useHouseholdViewModel } from "./hooks/useHouseholdViewModel";

/**
 * Pantalla "Mi familia": sin cuenta, crear la familia o unirse con una invitación, miembro, o admin
 * con su enlace de invitación. "use client" porque usa hooks y habla con
 * Supabase desde el navegador (la sesión vive en el navegador).
 */
export const Household = (): React.JSX.Element => {
  const viewModel = useHouseholdViewModel();
  const { invite } = viewModel;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 bg-tacha-bg px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold text-tacha-text">{HOUSEHOLD_TEXT.TITLE}</h1>
        {viewModel.householdName ? (
          <p className="font-body text-lg text-tacha-textsec">{viewModel.householdName}</p>
        ) : null}
      </div>

      {/* Siempre montada, aunque esté vacía: si la región naciera junto con el
          mensaje, el lector de pantalla podría no anunciarlo. Vive acá y no en
          la tarjeta porque la tarjeta no existe mientras no hay link. */}
      <p role="status" aria-live="polite" className="font-body text-sm text-tacha-teal">
        {viewModel.feedbackMessage}
      </p>
      {viewModel.errorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {viewModel.errorMessage}
        </p>
      ) : null}

      {viewModel.isLoading ? <Spinner /> : null}

      {viewModel.showNoAccount ? (
        <p className="rounded-tacha-badge border border-dashed border-tacha-border px-4 py-8 text-center font-body text-sm text-tacha-textsec">
          {HOUSEHOLD_TEXT.NO_ACCOUNT}
        </p>
      ) : null}

      {/* Sin familia: crear una o unirse con una invitación, las dos igual de
          visibles (DESIGN.md §7.15). */}
      {viewModel.showCreateForm ? (
        <>
          <HouseholdCreateForm
            isCreating={viewModel.isCreating}
            name={viewModel.name}
            nameError={viewModel.nameError}
            onNameChange={viewModel.onNameChange}
            onSubmit={viewModel.onCreateSubmit}
          />
          <HouseholdJoinForm {...viewModel.join} />
        </>
      ) : null}

      {viewModel.showMemberNotice ? (
        <p className="font-body text-sm text-tacha-textsec">{HOUSEHOLD_TEXT.MEMBER_NOTICE}</p>
      ) : null}

      {viewModel.showInvite ? (
        <section className="flex flex-col gap-4 rounded-tacha-card border border-tacha-border bg-tacha-surface p-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-xl font-semibold text-tacha-text">
              {HOUSEHOLD_INVITE_TEXT.SECTION_TITLE}
            </h2>
            <p className="font-body text-sm text-tacha-textsec">{HOUSEHOLD_INVITE_TEXT.DESCRIPTION}</p>
          </div>

          {invite.isLoading ? <Spinner /> : null}
          {invite.showInviteButton ? (
            <div>
              <Button isDisabled={invite.isGenerating} onClick={invite.onGenerate}>
                {invite.generateLabel}
              </Button>
            </div>
          ) : null}
          {invite.card ? <HouseholdInviteLinkCard {...invite.card} /> : null}
        </section>
      ) : null}
    </main>
  );
};
