// Claves del user_metadata de Supabase Auth donde viven los datos del perfil. `name` lo escribe el registro
// (SCRUM-37) y lo leen las RPC de household; `avatar_url` lo escribe el perfil (SCRUM-53);
// `terms_accepted_at` lo escribe el registro social al aceptar los términos (SCRUM-44).
export const USER_METADATA_KEY = {
  AVATAR_URL: "avatar_url",
  NAME: "name",
  TERMS_ACCEPTED_AT: "terms_accepted_at",
} as const;

// Máximo de caracteres del nombre (user_metadata.name): lo comparten el perfil y el registro social.
// Lo ven otros miembros del household, así que un nombre muy largo rompería su pantalla.
export const USER_NAME_MAX_LENGTH = 60;
