import type { AppNavLinkVariantType } from "../../constants/app-nav-link.constants";
import type { AppNavItemViewModel } from "../../models/AppNavItem.interface";

export interface AppNavLinkProps {
  item: AppNavItemViewModel;
  variant: AppNavLinkVariantType;
}
