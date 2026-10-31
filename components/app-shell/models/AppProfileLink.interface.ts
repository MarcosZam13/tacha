import type { AppRouteType } from "@/constants";
import type { NullableRef } from "@/types/nullable.types";

/** El acceso al perfil listo para dibujar: nombre, foto e iniciales ya salieron de la sesión. */
export interface AppProfileLinkViewModel {
  avatarUrl: NullableRef<string>;
  href: AppRouteType;
  initials: NullableRef<string>;
  isActive: boolean;
  /** null mientras no se conoce la sesión o si la cuenta no tiene nombre. */
  name: NullableRef<string>;
}
