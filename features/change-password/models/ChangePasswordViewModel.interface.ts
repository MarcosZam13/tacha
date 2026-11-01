import type { FormEvent } from "react";
import type { NewPasswordFieldType } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";
import type { PasswordStrength } from "@/types/password.types";
import type {
  ChangePasswordCurrentFieldType,
  ChangePasswordStatusType,
} from "../constants/change-password.constants";
import type { ChangePasswordFormValues } from "./ChangePasswordParams.interface";

export type ChangePasswordFieldType = ChangePasswordCurrentFieldType | NewPasswordFieldType;

export interface ChangePasswordViewModel {
  confirmPasswordError: NullableUndefined<string>;
  /** Solo la que da Supabase: la actual es incorrecta. La obligatoria no se muestra (Guardar queda deshabilitado). */
  currentPasswordError: NullableUndefined<string>;
  handleChange: (field: ChangePasswordFieldType) => (value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isSaveDisabled: boolean;
  isSaving: boolean;
  /** Solo con algo escrito en la nueva contraseña. */
  newPasswordError: NullableUndefined<string>;
  passwordStrength: NullableUndefined<PasswordStrength>;
  status: ChangePasswordStatusType;
  /** El fallo general del intento (red, servidor, límite, política de contraseñas). */
  submitError: NullableUndefined<string>;
  values: ChangePasswordFormValues;
}
