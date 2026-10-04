"use client";

import { CHANGE_PASSWORD_STEP } from "../constants/login.constants";
import { useChangePasswordViewModel } from "../hooks/useChangePasswordViewModel";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { PasswordChangedNotice } from "./PasswordChangedNotice";
import { WeakPasswordNotice } from "./WeakPasswordNotice";
import type { WeakPasswordFlowProps } from "./models/WeakPasswordFlowProps.interface";

/** Decide qué mostrar según el paso del cambio de contraseña: aviso, formulario o confirmación. */
export const WeakPasswordFlow = ({ onContinue }: WeakPasswordFlowProps): React.JSX.Element => {
  const viewModel = useChangePasswordViewModel();

  return viewModel.step === CHANGE_PASSWORD_STEP.DONE ? (
    <PasswordChangedNotice onContinue={onContinue} />
  ) : viewModel.step === CHANGE_PASSWORD_STEP.NOTICE ? (
    <WeakPasswordNotice onChangePassword={viewModel.handleOpenForm} onSkip={onContinue} />
  ) : (
    <ChangePasswordForm {...viewModel} />
  );
};
