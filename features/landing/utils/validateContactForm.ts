import { EMAIL_PATTERN } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";
import { normalizeEmail } from "@/utils/email.utils";
import { CONTACT_ERROR_MESSAGE, CONTACT_FIELD, CONTACT_LIMIT } from "../constants/contact.constants";
import type { ContactFormErrors, ContactFormValues } from "../models/ContactFormValues.interface";

interface TextRule {
  maxLength: number;
  minLength: number;
  requiredMessage: string;
  tooLongMessage: string;
  tooShortMessage: string;
}

const NAME_RULE: TextRule = {
  maxLength: CONTACT_LIMIT.NAME_MAX_LENGTH,
  minLength: CONTACT_LIMIT.NAME_MIN_LENGTH,
  requiredMessage: CONTACT_ERROR_MESSAGE.NAME_REQUIRED,
  tooLongMessage: CONTACT_ERROR_MESSAGE.NAME_TOO_LONG,
  tooShortMessage: CONTACT_ERROR_MESSAGE.NAME_TOO_SHORT,
};

const MESSAGE_RULE: TextRule = {
  maxLength: CONTACT_LIMIT.MESSAGE_MAX_LENGTH,
  minLength: CONTACT_LIMIT.MESSAGE_MIN_LENGTH,
  requiredMessage: CONTACT_ERROR_MESSAGE.MESSAGE_REQUIRED,
  tooLongMessage: CONTACT_ERROR_MESSAGE.MESSAGE_TOO_LONG,
  tooShortMessage: CONTACT_ERROR_MESSAGE.MESSAGE_TOO_SHORT,
};

// Los espacios de los extremos no cuentan, igual que en el servidor: "   " es un campo vacío.
const validateText = (value: string, rule: TextRule): NullableUndefined<string> => {
  const length = value.trim().length;
  if (length === 0) return rule.requiredMessage;
  if (length < rule.minLength) return rule.tooShortMessage;
  return length > rule.maxLength ? rule.tooLongMessage : undefined;
};

const validateEmail = (email: string): NullableUndefined<string> => {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail.length === 0) return CONTACT_ERROR_MESSAGE.EMAIL_REQUIRED;
  return normalizedEmail.length > CONTACT_LIMIT.EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(normalizedEmail)
    ? CONTACT_ERROR_MESSAGE.EMAIL_INVALID
    : undefined;
};

export const validateContactForm = (values: ContactFormValues): ContactFormErrors => ({
  [CONTACT_FIELD.EMAIL]: validateEmail(values.email),
  [CONTACT_FIELD.MESSAGE]: validateText(values.message, MESSAGE_RULE),
  [CONTACT_FIELD.NAME]: validateText(values.name, NAME_RULE),
});

export const hasContactErrors = (errors: ContactFormErrors): boolean =>
  Object.values(errors).some((message) => message !== undefined);
