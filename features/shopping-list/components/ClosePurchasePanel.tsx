import type { FormEvent } from "react";
import { Button, Input } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { PURCHASE_SESSION_TEXT } from "../constants/purchase-session.constants";
import type { ClosePurchasePanelProps } from "./models/ClosePurchasePanelProps.interface";

/**
 * "Cerrar compra" (HU-36f CA-07): el total gastado es opcional. Es un <form>
 * para que Enter en el campo también cierre; la validación del total la hace
 * el hook (parseSpentTotal), acá solo se muestra su error.
 */
export const ClosePurchasePanel = ({ panel }: ClosePurchasePanelProps): React.JSX.Element => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    panel.onSubmit();
  };

  return (
    <section
      aria-label={PURCHASE_SESSION_TEXT.CLOSE_TITLE}
      className="flex flex-col gap-3 rounded-tacha-badge border border-tacha-border bg-tacha-surface px-4 py-4"
    >
      <h2 className="font-display text-lg font-semibold text-tacha-text">{PURCHASE_SESSION_TEXT.CLOSE_TITLE}</h2>
      {panel.isAllChecked ? (
        <p className="font-body text-sm text-tacha-textsec">{PURCHASE_SESSION_TEXT.CLOSE_ALL_CHECKED}</p>
      ) : null}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label={PURCHASE_SESSION_TEXT.TOTAL_LABEL}
          value={panel.totalText}
          onChange={panel.onTotalChange}
          helperText={PURCHASE_SESSION_TEXT.TOTAL_HELPER}
          errorMessage={panel.totalErrorMessage ?? undefined}
        />
        {panel.closeErrorMessage ? (
          <p role="alert" className="font-body text-sm text-red-600">
            {panel.closeErrorMessage}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant={BUTTON_VARIANT.PRIMARY} isDisabled={panel.isClosing}>
            {PURCHASE_SESSION_TEXT.CLOSE}
          </Button>
          <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={panel.isClosing} onClick={panel.onDismiss}>
            {PURCHASE_SESSION_TEXT.KEEP_SHOPPING}
          </Button>
        </div>
      </form>
    </section>
  );
};
