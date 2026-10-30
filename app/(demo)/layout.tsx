import { notFound } from "next/navigation";
import type { JSX, ReactNode } from "react";
import { IS_DEV_TOOLS_ENABLED } from "@/constants";

export default function DemoLayout({ children }: { children: ReactNode }): JSX.Element {
  // Segunda capa: en producción proxy.ts ya respondió 404. Una ruta nueva de
  // este grupo con otro prefijo se agrega también al matcher de proxy.ts.
  if (!IS_DEV_TOOLS_ENABLED) notFound();

  return <>{children}</>;
}
