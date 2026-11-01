// Claves del user_metadata de Supabase Auth donde viven los datos del perfil. `name` lo escribe el registro
// (SCRUM-37) y lo leen las RPC de household; `avatar_url` lo escribe el perfil (SCRUM-53).
export const USER_METADATA_KEY = {
  AVATAR_URL: "avatar_url",
  NAME: "name",
} as const;
