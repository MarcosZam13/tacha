import type { JSX, ReactNode } from "react";

export default function DebugLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto">
        {children}
      </div>
    </div>
  );
}
