import type { FormEvent } from "react";
import type { NullableUndefined } from "@/types/nullable.types";

export interface CompleteSignUpFormProps {
  isSubmitDisabled: boolean;
  isTermsAccepted: boolean;
  name: string;
  nameError: NullableUndefined<string>;
  onNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onTermsAcceptedChange: (isChecked: boolean) => void;
  saveError: NullableUndefined<string>;
  submitLabel: string;
}
