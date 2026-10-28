import type { ContactSourceType } from "../constants/contact.constants";

export interface SubmitContactMessagePayload {
  captchaToken: string;
  email: string;
  message: string;
  name: string;
  source: ContactSourceType;
}

export interface SubmitContactMessageResponse {
  received: boolean;
}

export interface SubmitContactMessageError {
  code?: string;
}

