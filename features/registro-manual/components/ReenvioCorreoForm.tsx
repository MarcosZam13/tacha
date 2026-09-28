import { Button, Input } from "@/components/ui";
import { REGISTRO_LABEL } from "../constants/registro.constants";
import { useReenvioCorreoViewModel } from "../hooks/useReenvioCorreoViewModel";

export const ReenvioCorreoForm = (): React.JSX.Element => {
  const {
    email,
    errorMessage,
    feedbackMessage,
    handleEmailChange,
    handleSubmit,
    isSubmitDisabled,
    submitLabel,
  } = useReenvioCorreoViewModel();

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        isRequired
        label={REGISTRO_LABEL.EMAIL}
        type="email"
        value={email}
        onChange={handleEmailChange}
        errorMessage={errorMessage}
      />

      <Button type="submit" isDisabled={isSubmitDisabled}>
        {submitLabel}
      </Button>

      {feedbackMessage ? (
        <p role="status" className="font-body text-sm text-tacha-textsec">
          {feedbackMessage}
        </p>
      ) : null}
    </form>
  );
};