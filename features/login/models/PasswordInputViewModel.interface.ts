import type { INPUT_TYPE } from "../constants/login.constants";

export interface PasswordInputViewModel {
  errorId: string;
  inputId: string;
  inputType: typeof INPUT_TYPE.PASSWORD | typeof INPUT_TYPE.TEXT;
  isVisible: boolean;
  toggleVisibility: () => void;
}