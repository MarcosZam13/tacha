"use client";

import { RECAPTCHA_ERROR_MESSAGE } from "@/constants";
import { useRecaptchaWidgetViewModel } from "./hooks/useRecaptchaWidgetViewModel";
import type { RecaptchaWidgetProps } from "./models/RecaptchaWidgetProps.interface";

/** Casilla de reCAPTCHA v2. Entrega el token por `onTokenChange`; subir `resetCount` la reinicia. */
export const RecaptchaWidget = ({
  onTokenChange,
  resetCount,
}: RecaptchaWidgetProps): React.JSX.Element => {
  const { containerRef, hasLoadError } = useRecaptchaWidgetViewModel({ onTokenChange, resetCount });

  return (
    <div className="flex flex-col gap-2">
      <div ref={containerRef} />
      {hasLoadError ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {RECAPTCHA_ERROR_MESSAGE.LOAD_FAILED}
        </p>
      ) : null}
    </div>
  );
};
