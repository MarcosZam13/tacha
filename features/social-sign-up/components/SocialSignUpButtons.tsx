"use client";

import { BUTTON_VARIANT } from "@/constants";
import { Button } from "@/components/ui";
import { SOCIAL_PROVIDER_OPTIONS } from "../constants/social-sign-up.constants";
import { useSocialSignUpButtonsViewModel } from "../hooks/useSocialSignUpButtonsViewModel";

export const SocialSignUpButtons = (): React.JSX.Element => {
  const { errorMessage, handleProviderClick, isDisabled } = useSocialSignUpButtonsViewModel();

  return (
    <div className="flex flex-col gap-2">
      {SOCIAL_PROVIDER_OPTIONS.map(({ label, provider }) => (
        <Button
          key={provider}
          variant={BUTTON_VARIANT.SECONDARY}
          isDisabled={isDisabled}
          onClick={handleProviderClick(provider)}
        >
          {label}
        </Button>
      ))}

      {errorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};
