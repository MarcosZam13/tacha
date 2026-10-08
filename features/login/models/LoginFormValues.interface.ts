import type { LoginFieldType } from "../constants/login.constants";

export interface LoginFormValues {
  email: string;
  password: string;
}

export type LoginFormErrors = Partial<Record<LoginFieldType, string>>;
