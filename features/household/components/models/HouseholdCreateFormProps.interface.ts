import type { FormEvent } from "react";
import type { NullableUndefined } from "@/types/nullable.types";

/** Lo que el formulario dibuja; estado y validación viven en useHouseholdViewModel. */
export interface HouseholdCreateFormProps {
  isCreating: boolean;
  name: string;
  /** Error de validación del nombre; undefined si no hay. */
  nameError: NullableUndefined<string>;
  onNameChange: (name: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
