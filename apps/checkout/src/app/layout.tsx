import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import { THEME_BOOT } from "@viapay/prefs";
import { Providers } from "@/components/Providers";
import "@viapay/brand/tokens.css";
import "@viapay/prefs/controls.css";
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
  title: "Pagar con ViaPay",
  description: "Paga en Stellar firmando una sola transacción.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fd" },
    { media: "(prefers-color-scheme: dark)", color: "#121829" },
  ],
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
      suppressHydrationWarning
    >
      <body>
        <Script id="viapay-theme" strategy="beforeInteractive">
          {THEME_BOOT}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
