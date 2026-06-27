import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orisus BFS Monitor",
  description: "Internes Monitoring fuer BFS-Abrechnungsnachweise"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
