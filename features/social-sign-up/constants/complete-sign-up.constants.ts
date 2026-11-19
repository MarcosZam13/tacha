import { USER_NAME_MAX_LENGTH } from "@/constants";
import type { CompleteSignUpAccount } from "../models/CompleteSignUpAccount.interface";

// Formulario para completar el registro social (SCRUM-43, HU-20).

// LOADING: se lee la cuenta. NO_ACCOUNT: no hay un registro social en curso.
// READY: se puede editar y enviar. SAVING: se está guardando el nombre.
export const COMPLETE_SIGN_UP_STATUS = {
  LOADING: "loading",
  NO_ACCOUNT: "no-account",
  READY: "ready",
  SAVING: "saving",
} as const;

export type CompleteSignUpStatusType =
  (typeof COMPLETE_SIGN_UP_STATUS)[keyof typeof COMPLETE_SIGN_UP_STATUS];

// Qué necesita la cuenta que llega a /registro/completar.
// NOT_NEEDED: no hay nada que completar, porque ya terminó el registro o no es una cuenta
// social (una cuenta de correo nunca pasa por este formulario); va directo a la app.
export const COMPLETE_SIGN_UP_ACCOUNT_STATUS = {
  NO_ACCOUNT: "no-account",
  NOT_NEEDED: "not-needed",
  PENDING: "pending",
} as const;

export type CompleteSignUpAccountStatusType =
  (typeof COMPLETE_SIGN_UP_ACCOUNT_STATUS)[keyof typeof COMPLETE_SIGN_UP_ACCOUNT_STATUS];

// Sin sesión, con una sesión anónima o si la lectura falla: no hay registro que completar.
export const NO_COMPLETE_SIGN_UP_ACCOUNT: CompleteSignUpAccount = {
  name: "",
  status: COMPLETE_SIGN_UP_ACCOUNT_STATUS.NO_ACCOUNT,
};

export const COMPLETE_SIGN_UP_SAVE_RESULT = {
  ERROR: "error",
  SUCCESS: "success",
} as const;

export type CompleteSignUpSaveResultType =
  (typeof COMPLETE_SIGN_UP_SAVE_RESULT)[keyof typeof COMPLETE_SIGN_UP_SAVE_RESULT];

export const COMPLETE_SIGN_UP_LABEL = {
  DESCRIPTION: "Confirmá cómo querés que te llamemos en Tacha.",
  LOADING: "Cargando tus datos",
  NAME: "Nombre",
  NO_ACCOUNT_LINK: "Volver al registro",
  NO_ACCOUNT_MESSAGE: "No encontramos un registro en curso. Volvé a registrarte con Google o Facebook.",
  PAGE_TITLE: "Completar registro",
  SUBMIT: "Continuar",
  SUBMITTING: "Guardando...",
  TITLE: "Completá tu registro",
} as const;

// La puerta de las pantallas privadas (SCRUM-43): CHECKING mientras llega la sesión,
// OPEN si la cuenta puede usar la app, REDIRECTING si tiene que completar el registro.
export const COMPLETE_SIGN_UP_GATE_STATUS = {
  CHECKING: "checking",
  OPEN: "open",
  REDIRECTING: "redirecting",
} as const;

export type CompleteSignUpGateStatusType =
  (typeof COMPLETE_SIGN_UP_GATE_STATUS)[keyof typeof COMPLETE_SIGN_UP_GATE_STATUS];

export const COMPLETE_SIGN_UP_GATE_LABEL = {
  CHECKING: "Verificando tu cuenta",
} as const;

// Si la sesión no llega en este tiempo (por ejemplo, una renovación del token colgada), la puerta
// se abre: es un control de interfaz y abrir de más no expone datos; RLS sigue protegiéndolos.
export const COMPLETE_SIGN_UP_GATE_TIMEOUT_MS = 5_000;

export const COMPLETE_SIGN_UP_ERROR = {
  NAME_REQUIRED: "El nombre es obligatorio.",
  NAME_TOO_LONG: `El nombre no puede tener más de ${USER_NAME_MAX_LENGTH} caracteres.`,
  SAVE_FAILED: "No pudimos guardar tu nombre. Intentá de nuevo.",
} as const;
