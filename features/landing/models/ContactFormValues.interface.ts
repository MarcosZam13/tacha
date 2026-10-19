import type { ContactFieldType } from "../constants/contact.constants";

export interface ContactFormValues {
  email: string;
  message: string;
  name: string;
}

export type ContactFormErrors = Partial<Record<ContactFieldType, string>>;
