import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tacha",
  description: "App web colaborativa de listas de compras para grupos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
