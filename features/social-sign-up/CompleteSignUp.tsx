"use client";

import { Spinner } from "@/components/ui";
import { CompleteSignUpForm } from "./components/CompleteSignUpForm";
import { CompleteSignUpNoAccount } from "./components/CompleteSignUpNoAccount";
import { COMPLETE_SIGN_UP_LABEL } from "./constants/complete-sign-up.constants";
import { useCompleteSignUpViewModel } from "./hooks/useCompleteSignUpViewModel";

/**
 * Formulario para completar el registro social (SCRUM-43). "use client" porque lee
 * y guarda la cuenta con supabase-js desde el navegador.
 */
export const CompleteSignUp = (): React.JSX.Element => {
  const viewModel = useCompleteSignUpViewModel();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 bg-tacha-bg px-4 py-8">
      {viewModel.isLoading ? <Spinner label={COMPLETE_SIGN_UP_LABEL.LOADING} /> : null}

      {viewModel.isNoAccount ? <CompleteSignUpNoAccount /> : null}

      {viewModel.isFormVisible ? (
        <CompleteSignUpForm
          isSubmitDisabled={viewModel.isSubmitDisabled}
          isTermsAccepted={viewModel.isTermsAccepted}
          name={viewModel.name}
          nameError={viewModel.nameError}
          onNameChange={viewModel.handleNameChange}
          onSubmit={viewModel.handleSubmit}
          onTermsAcceptedChange={viewModel.handleTermsAcceptedChange}
          saveError={viewModel.saveError}
          submitLabel={viewModel.submitLabel}
        />
      ) : null}
    </main>
  );
};
