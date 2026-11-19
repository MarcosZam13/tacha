import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { APP_ROUTE } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";
import {
  COMPLETE_SIGN_UP_ACCOUNT_STATUS,
  COMPLETE_SIGN_UP_ERROR,
  COMPLETE_SIGN_UP_LABEL,
  COMPLETE_SIGN_UP_SAVE_RESULT,
  COMPLETE_SIGN_UP_STATUS,
  NO_COMPLETE_SIGN_UP_ACCOUNT,
} from "../constants/complete-sign-up.constants";
import type {
  CompleteSignUpSaveResultType,
  CompleteSignUpStatusType,
} from "../constants/complete-sign-up.constants";
import type { CompleteSignUpAccount } from "../models/CompleteSignUpAccount.interface";
import type { CompleteSignUpViewModel } from "../models/CompleteSignUpViewModel.interface";
import { getCompleteSignUpAccount, saveCompletedSignUp } from "../services/complete-sign-up.service";
import { validateSignUpName } from "../utils/validateSignUpName";

export const useCompleteSignUpViewModel = (): CompleteSignUpViewModel => {
  const router = useRouter();
  const [status, setStatus] = useState<CompleteSignUpStatusType>(COMPLETE_SIGN_UP_STATUS.LOADING);
  const [name, setName] = useState<string>("");
  const [nameError, setNameError] = useState<NullableUndefined<string>>(undefined);
  const [saveError, setSaveError] = useState<NullableUndefined<string>>(undefined);

  // Sincroniza con algo externo (la cuenta en Supabase): por eso es un efecto. Una cuenta que no
  // tiene nada que completar entra a la app. supabase-js puede rechazar sin respuesta (sin red):
  // en ese caso no se sabe de quién es la cuenta y se trata como sin registro en curso.
  useEffect(() => {
    let isCancelled = false;

    getCompleteSignUpAccount()
      .catch((): CompleteSignUpAccount => NO_COMPLETE_SIGN_UP_ACCOUNT)
      .then((account) => {
        if (isCancelled) return;

        if (account.status === COMPLETE_SIGN_UP_ACCOUNT_STATUS.NOT_NEEDED) {
          router.replace(APP_ROUTE.LIST);
          return;
        }

        setName(account.name);
        setStatus(
          account.status === COMPLETE_SIGN_UP_ACCOUNT_STATUS.PENDING
            ? COMPLETE_SIGN_UP_STATUS.READY
            : COMPLETE_SIGN_UP_STATUS.NO_ACCOUNT,
        );
      });

    return () => {
      isCancelled = true;
    };
  }, [router]);

  const handleNameChange = (value: string): void => {
    setName(value);
    setNameError(undefined);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    // Mientras guarda no se envía de nuevo: un doble clic no hace dos guardados.
    if (status !== COMPLETE_SIGN_UP_STATUS.READY) return;

    const validationError = validateSignUpName(name);
    setNameError(validationError);
    if (validationError) return;

    setStatus(COMPLETE_SIGN_UP_STATUS.SAVING);
    setSaveError(undefined);

    // saveCompletedSignUp no lanza, pero supabase-js sí puede rechazar si no hay red.
    const result = await saveCompletedSignUp(name).catch(
      (): CompleteSignUpSaveResultType => COMPLETE_SIGN_UP_SAVE_RESULT.ERROR,
    );

    // replace y no push: con push, "atrás" volvería al formulario de una cuenta ya completa.
    if (result === COMPLETE_SIGN_UP_SAVE_RESULT.SUCCESS) {
      router.replace(APP_ROUTE.LIST);
      return;
    }

    setSaveError(COMPLETE_SIGN_UP_ERROR.SAVE_FAILED);
    setStatus(COMPLETE_SIGN_UP_STATUS.READY);
  };

  const isSaving = status === COMPLETE_SIGN_UP_STATUS.SAVING;

  return {
    handleNameChange,
    handleSubmit,
    isFormVisible: status === COMPLETE_SIGN_UP_STATUS.READY || isSaving,
    isLoading: status === COMPLETE_SIGN_UP_STATUS.LOADING,
    isNoAccount: status === COMPLETE_SIGN_UP_STATUS.NO_ACCOUNT,
    isSubmitDisabled: isSaving,
    name,
    nameError,
    saveError,
    submitLabel: isSaving ? COMPLETE_SIGN_UP_LABEL.SUBMITTING : COMPLETE_SIGN_UP_LABEL.SUBMIT,
  };
};
