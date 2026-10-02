import { notFound } from "next/navigation";
import type { JSX, ReactNode } from "react";
import { IS_DEV_TOOLS_ENABLED } from "@/constants";

export default function DebugLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  if (!IS_DEV_TOOLS_ENABLED) notFound();

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto">
        {children}
      </div>
    </div>
  );
}
