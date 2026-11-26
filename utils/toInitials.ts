import type { NullableRef } from "@/types/nullable.types";

// Hasta dos letras: la inicial de las dos primeras palabras ("Ana María Pérez" → "AM").
const MAX_INITIALS = 2;

/**
 * Las iniciales que van en un avatar (integrantes de household, SCRUM-60; perfil
 * y navegación, SCRUM-53) cuando no hay foto. null si no hay nombre: la pantalla
 * muestra un ícono genérico. Función pura: los casos se prueban sin React.
 */
export const toInitials = (displayName: NullableRef<string>): NullableRef<string> => {
  const words = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return null;

  return words
    .slice(0, MAX_INITIALS)
    .map((word) => Array.from(word)[0].toLocaleUpperCase())
    .join("");
};
