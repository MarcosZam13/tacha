import { notFound } from "next/navigation";
import type { JSX, ReactNode } from "react";
import { IS_DEV_TOOLS_ENABLED } from "@/constants";

export default function DemoLayout({ children }: { children: ReactNode }): JSX.Element {
  if (!IS_DEV_TOOLS_ENABLED) notFound();

  return <>{children}</>;
}
