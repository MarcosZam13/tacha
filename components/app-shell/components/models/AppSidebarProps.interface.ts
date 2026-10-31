import type { AppNavigationProps } from "./AppNavigationProps.interface";
import type { AppProfileLinkProps } from "./AppProfileLinkProps.interface";

/** Lo que recibe el sidebar: los ítems de la navegación y el acceso al perfil. */
export type AppSidebarProps = AppNavigationProps & Pick<AppProfileLinkProps, "profileLink">;
