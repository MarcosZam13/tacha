import type { RegistroFieldType } from "../constants/registro.constants";

export interface RegistroFormValues {
    confirmPassword: string,
    email: string,
    name: string,
    password: string
}

export type RegistroFormErrors = Partial<Record<RegistroFieldType, string >>