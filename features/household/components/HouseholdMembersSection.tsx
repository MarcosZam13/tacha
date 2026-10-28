import { useEffect, useRef } from "react";
import { Button, Chip, Input, Spinner } from "@/components/ui";
import { BUTTON_VARIANT, CHIP_TONE } from "@/constants";
import { HOUSEHOLD_MEMBERS_TEXT, HOUSEHOLD_REMOVE_MEMBER_TEXT } from "../constants/household.constants";
import type { HouseholdMemberRow, HouseholdMembersSectionProps } from "./models/HouseholdMembersSectionProps.interface";

// Avatar de un integrante: sus iniciales o, sin nombre, una silueta genérica.
// Decorativo (aria-hidden): el nombre ya está en texto al lado.
const MemberAvatar = ({ initials }: Pick<HouseholdMemberRow, "initials">): React.JSX.Element => (
  <span
    aria-hidden="true"
    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tacha-teal/10 font-body text-sm font-semibold text-tacha-teal"
  >
    {initials ?? (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
      </svg>
    )}
  </span>
);

/**
 * "Integrantes de la familia" (SCRUM-60, CA-01 a CA-03). Solo presentación:
 * qué se busca, qué se carga y cuándo lo decide useHouseholdMembers a través
 * del ViewModel. La lista es un <ul>; la cantidad y "sin resultados" se
 * anuncian en role="status" y los errores en role="alert".
 *
 * SCRUM-61: las filas que lo traen muestran "Eliminar integrante". El botón es
 * nativo porque Button de components/ui no acepta aria-label, y todos dicen
 * lo mismo: el nombre accesible agrega el de la persona ("Eliminar integrante
 * Ana", SPEC §9, WCAG 2.5.3).
 */
export const HouseholdMembersSection = ({
  countText,
  errorMessage,
  hasMore,
  hasNoResults,
  isLoading,
  isLoadingMore,
  loadMoreErrorMessage,
  onLoadMore,
  onQueryChange,
  onRetry,
  query,
  rows,
  titleFocusKey,
}: HouseholdMembersSectionProps): React.JSX.Element => {
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Después de eliminar, la fila de la persona desaparece: el foco queda en
  // un lugar estable, el título de la sección (SPEC §9).
  useEffect(() => {
    if (titleFocusKey > 0) titleRef.current?.focus();
  }, [titleFocusKey]);

  return (
    <section
      aria-labelledby="household-members-title"
      className="flex flex-col gap-4 rounded-tacha-card border border-tacha-border bg-tacha-surface p-6"
    >
      <h2
        ref={titleRef}
        id="household-members-title"
        tabIndex={-1}
        className="font-display text-xl font-semibold text-tacha-text outline-none"
      >
        {HOUSEHOLD_MEMBERS_TEXT.TITLE}
      </h2>

      <Input
        label={HOUSEHOLD_MEMBERS_TEXT.SEARCH_LABEL}
        value={query}
        onChange={onQueryChange}
        placeholder={HOUSEHOLD_MEMBERS_TEXT.SEARCH_PLACEHOLDER}
      />

      {/* Siempre montada: si naciera junto con el texto, el lector de pantalla
          podría no anunciarlo (mismo criterio que Household.tsx). */}
      <p role="status" aria-live="polite" className="font-body text-sm text-tacha-textsec">
        {hasNoResults ? HOUSEHOLD_MEMBERS_TEXT.NO_RESULTS : countText}
      </p>

      {isLoading ? <Spinner /> : null}

      {errorMessage ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="font-body text-sm text-red-600">
            {errorMessage}
          </p>
          <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onRetry}>
            {HOUSEHOLD_MEMBERS_TEXT.RETRY}
          </Button>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <ul className="flex flex-col divide-y divide-tacha-border">
          {rows.map((row) => (
            <li key={row.rowKey} className="flex flex-wrap items-center gap-3 py-3">
              <MemberAvatar initials={row.initials} />
              <span className="min-w-0 flex-1 truncate font-body text-sm text-tacha-text">{row.label}</span>
              <span className="flex shrink-0 gap-2">
                {row.isAdmin ? <Chip tone={CHIP_TONE.TEAL}>{HOUSEHOLD_MEMBERS_TEXT.ADMIN}</Chip> : null}
                {row.isCurrentUser ? <Chip>{HOUSEHOLD_MEMBERS_TEXT.CURRENT_USER}</Chip> : null}
              </span>
              {row.onRemoveRequest ? (
                <button
                  type="button"
                  aria-label={`${HOUSEHOLD_REMOVE_MEMBER_TEXT.ACTION} ${row.label}`}
                  onClick={row.onRemoveRequest}
                  className="shrink-0 rounded-tacha-badge border border-tacha-teal px-3 py-1.5 font-body text-sm font-semibold text-tacha-teal hover:bg-tacha-teal/10"
                >
                  {HOUSEHOLD_REMOVE_MEMBER_TEXT.ACTION}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {loadMoreErrorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {loadMoreErrorMessage}
        </p>
      ) : null}

      {hasMore ? (
        <div>
          <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isLoadingMore} onClick={onLoadMore}>
            {isLoadingMore ? HOUSEHOLD_MEMBERS_TEXT.LOADING_MORE : HOUSEHOLD_MEMBERS_TEXT.LOAD_MORE}
          </Button>
        </div>
      ) : null}
    </section>
  );
};
