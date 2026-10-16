import { APP_ROUTE } from "@/constants";

// Constantes de la feature household: crear el household y su link de
// invitación (SCRUM-56), unirse con ese link (SCRUM-57) y salir (SCRUM-58).
// Viven dentro de la feature porque ninguna otra las usa todavía; se promueven
// a constants/ con el segundo consumidor. No confundir con constants/household.constants.ts
// (preferencias de tiendas).

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
    // Migración 014 (contrato en specs/SPEC.md §12).
    ACCEPT_HOUSEHOLD_INVITE: "accept_household_invite",
    CREATE_HOUSEHOLD: "create_household",
    CREATE_HOUSEHOLD_INVITE: "create_household_invite",
    GET_HOUSEHOLD_INVITE: "get_household_invite",
    // Migración 024 (contrato en specs/SPEC.md §12, SCRUM-59).
    DECIDE_PERSONAL_LISTS: "decide_personal_lists",
    // Migración 023 (contrato en specs/SPEC.md §12).
    GET_HOUSEHOLD_MEMBERS: "get_household_members",
    // Migración 024.
    GET_PERSONAL_LISTS_DECISION_STATE: "get_personal_lists_decision_state",
    LEAVE_HOUSEHOLD: "leave_household",
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

// Rutas propias de la feature. /login va acá y no se importa de features/login
// para no acoplar una feature a otra por una constante (como LANDING_ROUTE).
export const HOUSEHOLD_ROUTE = {
  HOUSEHOLD: APP_ROUTE.HOUSEHOLD,
  // Base del link: SCRUM-56 lo arma y SCRUM-57 lo abre con app/invitacion/[token].
  INVITATION: "/invitacion",
  LOGIN: "/login",
} as const;

// Un UUID 8-4-4-4-12 en hexadecimal, como los que genera gen_random_uuid().
// No exige una versión de UUID: la base tampoco la exige.
const INVITE_TOKEN_SOURCE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// Para reconocer el token en lo que pega el usuario (solo UX: la base lo
// vuelve a validar). "i": se aceptan mayúsculas.
export const HOUSEHOLD_INVITE_TOKEN_PATTERN = {
  // El texto completo es el código.
  CODE: new RegExp(`^${INVITE_TOKEN_SOURCE}$`, "i"),
  // Un enlace con /invitacion/<token>, seguido de fin, "/", "?" o "#".
  // Sin exigir protocolo ni dominio: cambian entre localhost y producción.
  LINK: new RegExp(`${HOUSEHOLD_ROUTE.INVITATION}/(${INVITE_TOKEN_SOURCE})(?:[/?#]|$)`, "i"),
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

// Lo que responde accept_household_invite (contrato en specs/SPEC.md §12).
// Los valores los decide la base; acá solo se nombran.
export const HOUSEHOLD_JOIN_RESULT = {
  ALREADY_MEMBER: "already_member",
  EXPIRED: "expired",
  IN_OTHER_HOUSEHOLD: "in_other_household",
  INVALID: "invalid",
  JOINED: "joined",
} as const;

export type HouseholdJoinResultType = (typeof HOUSEHOLD_JOIN_RESULT)[keyof typeof HOUSEHOLD_JOIN_RESULT];

// Estados de la página de invitación (unión en hooks/useHouseholdInvitationViewModel.ts).
export const HOUSEHOLD_JOIN_STATUS = {
  ALREADY_MEMBER: "alreadyMember",
  CHECKING: "checking",
  EXPIRED: "expired",
  FAILED: "failed",
  IN_OTHER_HOUSEHOLD: "inOtherHousehold",
  INVALID: "invalid",
  JOINED: "joined",
  JOINING: "joining",
  LOAD_FAILED: "loadFailed",
  NO_ACCOUNT: "noAccount",
  READY: "ready",
} as const;

export type HouseholdJoinStatusType = (typeof HOUSEHOLD_JOIN_STATUS)[keyof typeof HOUSEHOLD_JOIN_STATUS];

// Cada resultado de la base corresponde a un estado de la página.
export const HOUSEHOLD_JOIN_RESULT_STATUS: Record<HouseholdJoinResultType, HouseholdJoinStatusType> = {
  [HOUSEHOLD_JOIN_RESULT.ALREADY_MEMBER]: HOUSEHOLD_JOIN_STATUS.ALREADY_MEMBER,
  [HOUSEHOLD_JOIN_RESULT.EXPIRED]: HOUSEHOLD_JOIN_STATUS.EXPIRED,
  [HOUSEHOLD_JOIN_RESULT.IN_OTHER_HOUSEHOLD]: HOUSEHOLD_JOIN_STATUS.IN_OTHER_HOUSEHOLD,
  [HOUSEHOLD_JOIN_RESULT.INVALID]: HOUSEHOLD_JOIN_STATUS.INVALID,
  [HOUSEHOLD_JOIN_RESULT.JOINED]: HOUSEHOLD_JOIN_STATUS.JOINED,
};

export const HOUSEHOLD_JOIN_TEXT = {
  ALREADY_MEMBER: "Ya eres parte de esta familia.",
  DESCRIPTION: "Te invitaron a unirte a una familia en Tacha. Al unirte vas a compartir listas con ella.",
  EXPIRED: "Este enlace de invitación venció. Pídele uno nuevo a quien te invitó.",
  FAILED: "No se pudo completar la unión. Intenta de nuevo.",
  GO_TO_HOUSEHOLD: "Ir a mi familia",
  IN_OTHER_HOUSEHOLD: "Ya perteneces a una familia. Para unirte a otra, primero tienes que salir de la tuya.",
  INVALID: "Este enlace de invitación no es válido. Revisa que esté completo o pide uno nuevo.",
  JOIN: "Unirme",
  JOINED: "¡Listo! Ya eres parte de la familia.",
  JOINING: "Uniéndote…",
  // Sin botón de reintento: la salida es recargar la página (igual que SCRUM-56).
  LOAD_ERROR: "No se pudo comprobar tu sesión. Recarga la página para intentarlo de nuevo.",
  LOGIN: "Iniciar sesión",
  NO_ACCOUNT:
    "Necesitas una cuenta registrada para unirte a una familia. Inicia sesión y después vuelve a abrir este enlace.",
  TITLE: "Invitación a una familia",
} as const;

export const HOUSEHOLD_JOIN_FORM_TEXT = {
  DESCRIPTION: "Pega el enlace o el código que te compartieron.",
  INPUT_LABEL: "Enlace o código de invitación",
  SUBMIT: "Continuar",
  TITLE: "Unirme con una invitación",
} as const;

export const HOUSEHOLD_JOIN_FORM_ERROR = {
  INVALID: "Ese enlace o código no es válido. Revisa que esté completo.",
  REQUIRED: "Pega el enlace o el código de invitación.",
} as const;

// Lo que responde leave_household (contrato en specs/SPEC.md §12).
// Los valores los decide la base; acá solo se nombran.
export const HOUSEHOLD_LEAVE_RESULT = {
  HOUSEHOLD_DELETED: "household_deleted",
  INVALID_NEW_ADMIN: "invalid_new_admin",
  LEFT: "left",
  NOT_MEMBER: "not_member",
  TRANSFER_REQUIRED: "transfer_required",
} as const;

export type HouseholdLeaveResultType = (typeof HOUSEHOLD_LEAVE_RESULT)[keyof typeof HOUSEHOLD_LEAVE_RESULT];

// Estados del flujo de salir (unión en hooks/useHouseholdLeave.ts, specs/SPEC.md §6).
export const HOUSEHOLD_LEAVE_STATUS = {
  CONFIRMING: "confirming",
  FAILED: "failed",
  IDLE: "idle",
  LEAVING: "leaving",
  LOADING_MEMBERS: "loadingMembers",
  MEMBERS_LOAD_FAILED: "membersLoadFailed",
} as const;

export type HouseholdLeaveStatusType = (typeof HOUSEHOLD_LEAVE_STATUS)[keyof typeof HOUSEHOLD_LEAVE_STATUS];

// Qué explica el diálogo de salir según quién sale (specs/SPEC.md §8).
export const HOUSEHOLD_LEAVE_DIALOG_CASE = {
  // Miembro: confirma y sale.
  MEMBER: "member",
  // Admin único miembro: la familia y su enlace se eliminan.
  SOLE_ADMIN: "soleAdmin",
  // Admin con otros miembros: elige al nuevo admin antes de salir.
  TRANSFER: "transfer",
} as const;

export type HouseholdLeaveDialogCaseType =
  (typeof HOUSEHOLD_LEAVE_DIALOG_CASE)[keyof typeof HOUSEHOLD_LEAVE_DIALOG_CASE];

export const HOUSEHOLD_LEAVE_TEXT = {
  CANCEL: "Cancelar",
  CONFIRM: "Salir",
  // Título "¿Salir de {nombre de la familia}?", armado en useHouseholdViewModel.
  DIALOG_TITLE_PREFIX: "¿Salir de",
  DIALOG_TITLE_SUFFIX: "?",
  // Se reintenta con el mismo botón "Salir" (specs/SPEC.md §7).
  FAILED: "No se pudo salir de tu familia. Intenta de nuevo.",
  HOUSEHOLD_DELETED: "Saliste y la familia se eliminó.",
  INVALID_NEW_ADMIN: "Esa persona ya no es parte de tu familia. Elige a otra.",
  LEAVE: "Salir de la familia",
  LEAVING: "Saliendo…",
  LEFT: "Saliste de la familia.",
  MEMBER_DESCRIPTION: "Vas a dejar de ver lo que comparte esta familia.",
  MEMBERS_LOAD_ERROR: "No se pudieron cargar los miembros de tu familia. Intenta de nuevo.",
  NEW_ADMIN_LEGEND: "¿Quién va a administrar la familia?",
  // CA-04: al salir se conservan la lista general y las privadas.
  SECTION_DESCRIPTION: "Puedes salir de tu familia cuando quieras. Tus listas personales se quedan contigo.",
  SOLE_ADMIN_DESCRIPTION:
    "Eres la única persona en esta familia. Si sales, la familia y su enlace de invitación se eliminan.",
  TRANSFER_DESCRIPTION: "Antes de salir, elige quién va a administrar la familia.",
  TRANSFER_REQUIRED: "Elige a quién le pasas la administración antes de salir.",
  // Los miembros sin nombre en el registro: nunca se muestra el correo.
  UNNAMED_MEMBER: "Miembro sin nombre",
} as const;

// Qué explica el diálogo en cada caso (Strategy: sin if encadenados en la vista).
export const HOUSEHOLD_LEAVE_DIALOG_DESCRIPTION: Record<HouseholdLeaveDialogCaseType, string> = {
  [HOUSEHOLD_LEAVE_DIALOG_CASE.MEMBER]: HOUSEHOLD_LEAVE_TEXT.MEMBER_DESCRIPTION,
  [HOUSEHOLD_LEAVE_DIALOG_CASE.SOLE_ADMIN]: HOUSEHOLD_LEAVE_TEXT.SOLE_ADMIN_DESCRIPTION,
  [HOUSEHOLD_LEAVE_DIALOG_CASE.TRANSFER]: HOUSEHOLD_LEAVE_TEXT.TRANSFER_DESCRIPTION,
};

export const HOUSEHOLD_LEAVE_FORM = {
  // Mismo name para todos los radios: las flechas del teclado se mueven entre ellos.
  NEW_ADMIN_RADIO_NAME: "household-new-admin",
} as const;

// Lo que la persona elige hacer con su lista personal (SCRUM-59). La base
// valida los valores (check de household_members.personal_lists_decision).
export const HOUSEHOLD_LISTS_CHOICE = {
  KEEP: "keep",
  SHARE: "share",
} as const;

export type HouseholdListsChoiceType = (typeof HOUSEHOLD_LISTS_CHOICE)[keyof typeof HOUSEHOLD_LISTS_CHOICE];

// Lo que responde get_personal_lists_decision_state (contrato en specs/SPEC.md §12).
export const HOUSEHOLD_LISTS_DECISION_STATE = {
  DECIDED: "decided",
  NOT_MEMBER: "not_member",
  NOTHING_TO_DECIDE: "nothing_to_decide",
  PENDING: "pending",
} as const;

export type HouseholdListsDecisionStateType =
  (typeof HOUSEHOLD_LISTS_DECISION_STATE)[keyof typeof HOUSEHOLD_LISTS_DECISION_STATE];

// Lo que responde decide_personal_lists (contrato en specs/SPEC.md §12).
export const HOUSEHOLD_LISTS_DECISION_RESULT = {
  ALREADY_DECIDED: "already_decided",
  KEPT: "kept",
  NOT_MEMBER: "not_member",
  // Eligió compartir, pero no pasó nada: la familia ya había comprado todo.
  NOTHING_SHARED: "nothing_shared",
  SHARED: "shared",
  // Pasó al menos uno; lo que la familia ya compró se quedó en la lista personal.
  SHARED_PARTIALLY: "shared_partially",
} as const;

export type HouseholdListsDecisionResultType =
  (typeof HOUSEHOLD_LISTS_DECISION_RESULT)[keyof typeof HOUSEHOLD_LISTS_DECISION_RESULT];

// Estados de la pregunta (unión en hooks/usePersonalListsDecision.ts, specs/SPEC.md §6).
export const HOUSEHOLD_LISTS_DECISION_STATUS = {
  ASKING: "asking",
  FAILED: "failed",
  HIDDEN: "hidden",
  SAVING: "saving",
} as const;

export type HouseholdListsDecisionStatusType =
  (typeof HOUSEHOLD_LISTS_DECISION_STATUS)[keyof typeof HOUSEHOLD_LISTS_DECISION_STATUS];

export const HOUSEHOLD_LISTS_DECISION_TEXT = {
  // Propuesto: DESIGN.md §7.15 pide aclarar que aplica a todo y una sola vez.
  DESCRIPTION: "Tu decisión aplica a todo lo pendiente de tu lista personal y no se vuelve a preguntar.",
  // Textos aprobados por la dueña de la historia (D8).
  KEEP: "Mantenerla solo para mí",
  // Propuestos: el aviso después de decidir.
  KEPT: "Tu lista personal sigue siendo solo tuya.",
  // Propuesto: no pasó ningún producto.
  NOTHING_SHARED: "No se compartió nada: tu familia ya había comprado todo lo que tenías pendiente.",
  QUESTION: "¿Qué quieres hacer con tu lista actual?",
  SAVE_ERROR: "No se pudo guardar tu decisión. Intenta de nuevo.",
  SHARE: "Compartirla con mi familia",
  SHARED: "Lo pendiente de tu lista ahora está en la lista de tu familia.",
  // Propuesto: pasó al menos uno y alguno se quedó.
  SHARED_PARTIALLY:
    "Compartiste tu lista. Lo que tu familia ya había comprado se quedó en tu lista personal.",
} as const;
