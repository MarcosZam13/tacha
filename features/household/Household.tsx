"use client";

import { Button, Spinner } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { HouseholdCreateForm } from "./components/HouseholdCreateForm";
import { HouseholdInviteLinkCard } from "./components/HouseholdInviteLinkCard";
import { HouseholdJoinForm } from "./components/HouseholdJoinForm";
import { HouseholdLeaveDialog } from "./components/HouseholdLeaveDialog";
import { HouseholdMembersSection } from "./components/HouseholdMembersSection";
import { PersonalListsDecision } from "./components/PersonalListsDecision";
import { HOUSEHOLD_INVITE_TEXT, HOUSEHOLD_LEAVE_TEXT, HOUSEHOLD_TEXT } from "./constants/household.constants";
import { useHouseholdViewModel } from "./hooks/useHouseholdViewModel";

/**
 * Pantalla "Mi familia": sin cuenta, crear la familia o unirse con una invitación, miembro, o admin
 * con su enlace de invitación; miembro y admin ven a los integrantes y pueden salir de la familia. "use client" porque usa hooks y habla con
 * Supabase desde el navegador (la sesión vive en el navegador).
 */
export const Household = (): React.JSX.Element => {
  const viewModel = useHouseholdViewModel();
  const { invite, leave } = viewModel;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
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

      {/* SCRUM-59: arriba de todo, porque es lo primero que hay que decidir
          después de crear la familia. */}
      {viewModel.showListsDecision ? <PersonalListsDecision {...viewModel.listsDecision} /> : null}

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

      {/* SCRUM-60: miembro y admin ven quién es parte de su familia. */}
      {viewModel.showMembers ? <HouseholdMembersSection {...viewModel.members} /> : null}

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

      {viewModel.showLeave ? (
        <section className="flex flex-col gap-4 rounded-tacha-card border border-tacha-border bg-tacha-surface p-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-xl font-semibold text-tacha-text">{HOUSEHOLD_LEAVE_TEXT.LEAVE}</h2>
            <p className="font-body text-sm text-tacha-textsec">{HOUSEHOLD_LEAVE_TEXT.SECTION_DESCRIPTION}</p>
          </div>
          <div>
            <Button variant={BUTTON_VARIANT.SECONDARY} onClick={leave.onLeaveRequest}>
              {HOUSEHOLD_LEAVE_TEXT.LEAVE}
            </Button>
          </div>
        </section>
      ) : null}

      {/* Siempre montado: el Modal decide si se ve. Se queda abierto mientras
          sale aunque la sección de arriba ya no esté. */}
      <HouseholdLeaveDialog {...leave.dialog} />
    </div>
  );
};
