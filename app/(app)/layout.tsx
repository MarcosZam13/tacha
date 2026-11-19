import { AppShell } from "@/components/app-shell/AppShell";
import { CompleteSignUpGate } from "@/features/social-sign-up/CompleteSignUpGate";

interface AppLayoutProps {
  children: React.ReactNode;
}

// Grupo de rutas privadas: (app) no agrega segmento a la URL. Toda pantalla
// de este grupo va dentro del shell de navegación (sidebar / tabs). Una cuenta
// social que no completó el registro va antes a /registro/completar (SCRUM-43).
const AppLayout = ({ children }: AppLayoutProps): React.JSX.Element => (
  <CompleteSignUpGate>
    <AppShell>{children}</AppShell>
  </CompleteSignUpGate>
);

export default AppLayout;
