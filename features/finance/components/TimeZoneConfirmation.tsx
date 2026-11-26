import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { FINANCE_TEXT } from "../constants/finance.constants";
import type { TimeZoneConfirmationProps } from "./models/TimeZoneConfirmationProps.interface";

/**
 * La salida de TZ002 en el Historial (SCRUM-91, regla 60): la zona del navegador
 * y "Confirmar". El porqué ya lo dice el error del total, en su lugar. Nunca se
 * guarda sin ese toque; lo guarda useTotalEdit.
 */
export const TimeZoneConfirmation = ({
  errorMessage,
  isSaving,
  onConfirm,
  timeZone,
}: TimeZoneConfirmationProps): React.JSX.Element => (
  <div className="mt-4 flex flex-col items-start gap-2">
    <p className="font-body text-sm text-tacha-text">
      {FINANCE_TEXT.TIME_ZONE_PREFIX}
      {timeZone}
    </p>
    <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isSaving} onClick={onConfirm}>
      {FINANCE_TEXT.CONFIRM_TIME_ZONE}
    </Button>
    {errorMessage ? (
      <p role="alert" className="font-body text-sm text-red-600">
        {errorMessage}
      </p>
    ) : null}
  </div>
);
