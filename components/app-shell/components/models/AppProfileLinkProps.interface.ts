import type { AppProfileLinkViewModel } from "../../models/AppProfileLink.interface";

export interface AppProfileLinkProps {
  /** El sidebar muestra el nombre junto al avatar; la cabecera de mobile, solo el avatar. */
  isNameVisible: boolean;
  profileLink: AppProfileLinkViewModel;
}
