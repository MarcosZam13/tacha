import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { HOUSEHOLD_LISTS_DECISION_TEXT } from "../constants/household.constants";
import type { PersonalListsDecisionProps } from "./models/PersonalListsDecisionProps.interface";

/**
 * "¿Qué quieres hacer con tu lista actual?" (SCRUM-59, DESIGN.md §7.15). Solo
 * presentación: cuándo se muestra y qué pasa al elegir lo decide
 * usePersonalListsDecision. Las dos opciones tienen el mismo peso visual
 * (CA-01): la misma variante, el mismo tamaño y ninguna preseleccionada.
 */
export const PersonalListsDecision = ({
  errorMessage,
  isSaving,
  onKeep,
  onShare,
}: PersonalListsDecisionProps): React.JSX.Element => (
  <section
    aria-label={HOUSEHOLD_LISTS_DECISION_TEXT.QUESTION}
    aria-busy={isSaving}
    className="flex flex-col gap-4 rounded-tacha-card border border-tacha-teal bg-tacha-surface p-6"
  >
    <div className="flex flex-col gap-1">
      <h2 className="font-display text-xl font-semibold text-tacha-text">{HOUSEHOLD_LISTS_DECISION_TEXT.QUESTION}</h2>
      <p className="font-body text-sm text-tacha-textsec">{HOUSEHOLD_LISTS_DECISION_TEXT.DESCRIPTION}</p>
    </div>
    <div className="flex flex-wrap gap-3">
      <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isSaving} onClick={onKeep}>
        {HOUSEHOLD_LISTS_DECISION_TEXT.KEEP}
      </Button>
      <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isSaving} onClick={onShare}>
        {HOUSEHOLD_LISTS_DECISION_TEXT.SHARE}
      </Button>
    </div>
    {errorMessage ? (
      <p role="alert" className="font-body text-sm text-red-600">
        {errorMessage}
      </p>
    ) : null}
  </section>
);
