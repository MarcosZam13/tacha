"use client";

import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { BACK_BUTTON_TEXT } from "../constants/landing.constants";
import { useBackButtonViewModel } from "../hooks/useBackButtonViewModel";

export const BackButton = (): React.JSX.Element => {
  const { goBack } = useBackButtonViewModel();

  return (
    <div>
      <Button variant={BUTTON_VARIANT.SECONDARY} onClick={goBack}>
        {BACK_BUTTON_TEXT.LABEL}
      </Button>
    </div>
  );
};
