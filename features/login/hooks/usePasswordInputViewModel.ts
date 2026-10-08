import { useId, useState } from "react";
import { INPUT_TYPE } from "../constants/login.constants";
import type { PasswordInputViewModel } from "../models/PasswordInputViewModel.interface";

export const usePasswordInputViewModel = (): PasswordInputViewModel => {
  const inputId = useId();
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = (): void => setIsVisible((previous) => !previous);

  return {
    errorId: `${inputId}-error`,
    inputId,
    // Se calcula en cada render (no es estado): depende solo de isVisible.
    inputType: isVisible ? INPUT_TYPE.TEXT : INPUT_TYPE.PASSWORD,
    isVisible,
    toggleVisibility,
  };
};