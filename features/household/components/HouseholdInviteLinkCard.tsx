import { Button, Chip } from "@/components/ui";
import { BUTTON_VARIANT, CHIP_TONE } from "@/constants";
import { HOUSEHOLD_INVITE_TEXT } from "../constants/household.constants";
import type { HouseholdInviteLinkCardProps } from "./models/HouseholdInviteLinkCardProps.interface";

/**
 * Tarjeta del link de invitación. Solo presentación: estado, textos y fecha
 * llegan ya calculados desde useHouseholdViewModel. Los mensajes (confirmación y
 * errores) no viven acá sino en Household.tsx, que siempre está montada.
 *
 * El link se muestra como texto, no como enlace: la página que lo abre es
 * HU-34. `select-all` permite seleccionarlo entero de un click para copiarlo
 * a mano si falla el portapapeles.
 */
export const HouseholdInviteLinkCard = ({
  expiryDateText,
  expiryLabel,
  isExpired,
  isGenerating,
  onCopy,
  onRegenerate,
  regenerateLabel,
  statusLabel,
  url,
}: HouseholdInviteLinkCardProps): React.JSX.Element => (
  <article className="flex flex-col gap-4 rounded-tacha-card border border-tacha-border bg-tacha-bg p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-display text-lg font-semibold text-tacha-text">{HOUSEHOLD_INVITE_TEXT.LINK_LABEL}</h3>
      {/* El estado va escrito en el Chip: no depende solo del color. */}
      <Chip tone={isExpired ? CHIP_TONE.TERRACOTTA : CHIP_TONE.TEAL}>{statusLabel}</Chip>
    </div>

    <p className="select-all break-all rounded-tacha-badge border border-tacha-border bg-tacha-surface px-3 py-2 font-body text-sm text-tacha-text">
      {url}
    </p>

    <dl className="flex flex-wrap gap-1 font-body text-sm">
      <dt className="font-medium text-tacha-text">{expiryLabel}</dt>
      <dd className="text-tacha-textsec">{expiryDateText}</dd>
    </dl>

    <div className="flex flex-wrap gap-3">
      {isExpired ? null : (
        <Button isDisabled={isGenerating} onClick={onCopy}>
          {HOUSEHOLD_INVITE_TEXT.COPY_LINK}
        </Button>
      )}
      <Button
        variant={isExpired ? BUTTON_VARIANT.PRIMARY : BUTTON_VARIANT.SECONDARY}
        isDisabled={isGenerating}
        onClick={onRegenerate}
      >
        {regenerateLabel}
      </Button>
    </div>
  </article>
);
