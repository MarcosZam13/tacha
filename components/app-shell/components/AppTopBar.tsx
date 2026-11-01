import { APP_SHELL_TEXT } from "../constants/app-shell.constants";
import { AppProfileLink } from "./AppProfileLink";
import type { AppTopBarProps } from "./models/AppTopBarProps.interface";

/**
 * Cabecera de mobile (< md): la marca y el acceso al perfil. En desktop el perfil va al pie del sidebar.
 * Existe porque las tabs de abajo están limitadas a 5 y todavía no hay menú "Más" (DESIGN.md §3.2).
 */
export const AppTopBar = ({ profileLink }: AppTopBarProps): React.JSX.Element => (
  <header className="sticky top-0 z-10 flex items-center justify-between border-b border-tacha-border bg-tacha-surface px-4 py-2 md:hidden">
    <p className="font-display text-xl font-bold text-tacha-text">{APP_SHELL_TEXT.BRAND}</p>
    <AppProfileLink isNameVisible={false} profileLink={profileLink} />
  </header>
);
