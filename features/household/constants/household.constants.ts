// Constantes de la feature household (SCRUM-56): crear el household y su link
// de invitación. Viven dentro de la feature porque ninguna otra las usa
// todavía; se promueven a constants/ con el segundo consumidor. No confundir
// con constants/household.constants.ts (preferencias de tiendas).

// Roles de household_members: el mismo dominio que el check de la migración 011.
export const HOUSEHOLD_ROLE = {
  ADMIN: "admin",
  MEMBER: "member",
} as const;

export type HouseholdRoleType = (typeof HOUSEHOLD_ROLE)[keyof typeof HOUSEHOLD_ROLE];

export const HOUSEHOLD_DB = {
  // .eq() acepta cualquier string (no lo valida el genérico Database), así
  // que la columna va como constante: un typo acá compilaría y fallaría en runtime.
  COLUMN: {
    USER_ID: "user_id",
  },
  // La membresía propia con el nombre de su household, en una sola petición.
  // Las columnas no llevan constante propia: el genérico Database de
  // types/database.types.ts las valida al compilar.
  MEMBERSHIP_SELECT: "role, households(name)",
  RPC: {
    CREATE_HOUSEHOLD: "create_household",
    CREATE_HOUSEHOLD_INVITE: "create_household_invite",
    GET_HOUSEHOLD_INVITE: "get_household_invite",
  },
  TABLE: {
    HOUSEHOLD_MEMBERS: "household_members",
  },
} as const;

// Mismo tope que households_name_check en la migración 011: el formulario
// avisa antes de mandar; la base es la garantía.
export const HOUSEHOLD_FORM_LIMIT = {
  NAME_MAX_LENGTH: 60,
} as const;

// Estados de la pantalla (unión en hooks/useHouseholdViewModel.ts).
export const HOUSEHOLD_SCREEN_STATUS = {
  ADMIN: "admin",
  CREATING: "creating",
  LOAD_FAILED: "loadFailed",
  LOADING: "loading",
  MEMBER: "member",
  NO_ACCOUNT: "noAccount",
  NO_HOUSEHOLD: "noHousehold",
} as const;

// Estados del link de invitación (unión en hooks/useHouseholdInvite.ts).
export const HOUSEHOLD_INVITE_STATUS = {
  EMPTY: "empty",
  GENERATING: "generating",
  LOAD_FAILED: "loadFailed",
  LOADING: "loading",
  READY: "ready",
} as const;

// Resultado del último intento de copiar el link.
export const HOUSEHOLD_INVITE_COPY_STATUS = {
  COPIED: "copied",
  FAILED: "failed",
  IDLE: "idle",
} as const;

export type HouseholdInviteCopyStatusType =
  (typeof HOUSEHOLD_INVITE_COPY_STATUS)[keyof typeof HOUSEHOLD_INVITE_COPY_STATUS];

export const HOUSEHOLD_INVITE_TIME_MS = {
  // Cuánto se ve "¡Copiado!" antes de borrarse solo. La duración del link no
  // está acá: la fija la base (migración 011).
  COPY_FEEDBACK: 2_000,
} as const;

export const HOUSEHOLD_ROUTE = {
  // Base del link que va a abrir HU-34 (SCRUM-57) con app/invitacion/[token].
  // Esa página NO es parte de esta historia: HU-33 solo arma el link.
  INVITATION: "/invitacion",
} as const;

// Cómo se muestra la fecha de vencimiento ("8 de octubre de 2026 a las 10:01 p. m.").
export const HOUSEHOLD_INVITE_DATE_FORMAT = {
  LOCALE: "es-CR",
  OPTIONS: {
    dateStyle: "long",
    timeStyle: "short",
  },
} as const satisfies { LOCALE: string; OPTIONS: Intl.DateTimeFormatOptions };

export const HOUSEHOLD_FORM_ERROR = {
  NAME_REQUIRED: "Escribe el nombre de tu familia.",
  NAME_TOO_LONG: `El nombre puede tener hasta ${HOUSEHOLD_FORM_LIMIT.NAME_MAX_LENGTH} caracteres.`,
} as const;

export const HOUSEHOLD_TEXT = {
  CREATE: "Crear mi familia",
  CREATE_DESCRIPTION: "Crea tu familia en Tacha para compartir tus listas. Vas a quedar como administrador.",
  CREATE_ERROR: "No se pudo crear tu familia. Intenta de nuevo.",
  CREATE_TITLE: "Crea tu familia",
  CREATING: "Creando…",
  // Sin botón de reintento: la salida es recargar la página.
  LOAD_ERROR: "No se pudo cargar tu familia. Recarga la página para intentarlo de nuevo.",
  MEMBER_NOTICE: "Solo el administrador de la familia puede invitar a otras personas.",
  NAME_LABEL: "Nombre de la familia",
  NAME_PLACEHOLDER: "Ej. Familia Alpízar",
  NO_ACCOUNT: "Necesitas una cuenta registrada para crear o administrar tu familia.",
  TITLE: "Mi familia",
} as const;

export const HOUSEHOLD_INVITE_TEXT = {
  ACTIVE: "Activo",
  COPIED: "¡Copiado!",
  COPY_FAILED: "No se pudo copiar. Selecciona el enlace y cópialo manualmente.",
  COPY_LINK: "Copiar enlace",
  DESCRIPTION: "Genera un enlace para que tu familia se una sin invitar a cada persona por correo.",
  EXPIRED: "Expirado",
  EXPIRED_LABEL: "Venció",
  EXPIRES_LABEL: "Vence",
  GENERATE_ERROR: "No se pudo generar el enlace. Intenta de nuevo.",
  GENERATING: "Generando…",
  INVITE: "Generar enlace de invitación",
  LINK_LABEL: "Enlace de invitación",
  // Sin botón de reintento: la salida es recargar la página.
  LOAD_ERROR: "No se pudo cargar el enlace de invitación. Recarga la página para intentarlo de nuevo.",
  REGENERATE: "Generar nuevo enlace",
  // Regenerar reemplaza el token en la base: el anterior ya no existe.
  REPLACED: "Generaste un enlace nuevo. El anterior dejó de funcionar.",
  SECTION_TITLE: "Invitar a mi familia",
} as const;
