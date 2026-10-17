import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amazônico GEO — Visibilidade em IA",
  description: "Entenda como sistemas de IA apresentam sua empresa.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
