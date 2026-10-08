"use client";

import { LOGIN_ERROR_MESSAGE } from "../constants/login.constants";
import { useRecaptchaWidgetViewModel } from "../hooks/useRecaptchaWidgetViewModel";
import type { RecaptchaWidgetProps } from "../models/RecaptchaWidgetProps.interface";

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
          {LOGIN_ERROR_MESSAGE.RECAPTCHA_LOAD_FAILED}
        </p>
      ) : null}
    </div>
  );
};