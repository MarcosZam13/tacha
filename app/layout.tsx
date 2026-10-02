import type { Metadata } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Tacha",
  description: "Listas de compras colaborativas para el hogar.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps): React.JSX.Element => (
  <html lang="es">
    <body className={`${fraunces.variable} ${publicSans.variable} antialiased`}>
      {children}
    </body>
  </html>
);

export default RootLayout;
