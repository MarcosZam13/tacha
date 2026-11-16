import type { FormEvent } from "react";
import type { NullableUndefined } from "@/types/nullable.types";

export interface CompleteSignUpFormProps {
  isSubmitDisabled: boolean;
  name: string;
  nameError: NullableUndefined<string>;
  onNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  saveError: NullableUndefined<string>;
  submitLabel: string;
}
