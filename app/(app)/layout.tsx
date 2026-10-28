import { AppShell } from "@/components/app-shell/AppShell";

interface AppLayoutProps {
  children: React.ReactNode;
}

// Grupo de rutas privadas: (app) no agrega segmento a la URL. Toda pantalla
// de este grupo va dentro del shell de navegación (sidebar / tabs).
const AppLayout = ({ children }: AppLayoutProps): React.JSX.Element => <AppShell>{children}</AppShell>;

export default AppLayout;
