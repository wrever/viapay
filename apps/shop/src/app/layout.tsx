import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Bricolage_Grotesque, Figtree, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
});

const body = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-figtree",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Tienda de prueba · ViaPay",
  description:
    "App de prueba del flujo redirect: crear cobro → checkout ViaPay → volver a success/cancel.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body
        style={
          {
            ["--font-display" as string]: "var(--font-bricolage)",
            ["--font-body" as string]: "var(--font-figtree)",
            ["--font-mono" as string]: "var(--font-plex-mono)",
          } as CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
