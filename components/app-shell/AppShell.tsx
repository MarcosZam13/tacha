"use client";

import { AppSidebar } from "./components/AppSidebar";
import { AppTabBar } from "./components/AppTabBar";
import { useAppShellViewModel } from "./hooks/useAppShellViewModel";
import type { AppShellProps } from "./models/AppShellProps.interface";

/**
 * Esqueleto de toda pantalla privada (app/(app)/layout.tsx): sidebar en
 * desktop, tabs en mobile y el único <main> de la página. Cuál se ve lo decide
 * el CSS (md:), no JS, así que no hay diferencia entre servidor y cliente.
 * "use client" por usePathname en el ViewModel.
 */
export const AppShell = ({ children }: AppShellProps): React.JSX.Element => {
  const { navItems } = useAppShellViewModel();

  return (
    <div className="flex min-h-screen bg-tacha-bg">
      <AppSidebar navItems={navItems} />
      {/* pb-20: en mobile la barra de tabs fija no tapa el final de la pantalla. */}
      <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      <AppTabBar navItems={navItems} />
    </div>
  );
};
