import type { CompleteSignUpAccountStatusType } from "../constants/complete-sign-up.constants";

/** La cuenta que llega a /registro/completar, ya decidida. */
export interface CompleteSignUpAccount {
  /** El nombre que entregó el proveedor, o "" si no entregó uno. */
  name: string;
  status: CompleteSignUpAccountStatusType;
}
