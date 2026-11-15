import type { NullableRef } from "@/types/nullable.types";

/** Una persona que puede ser encargada de un producto: tiene acceso a la lista. */
export interface AssigneeCandidate {
  /** Puede ser nulo: no todas las cuentas guardaron un nombre en el registro. */
  displayName: NullableRef<string>;
  isCurrentUser: boolean;
  userId: string;
}
