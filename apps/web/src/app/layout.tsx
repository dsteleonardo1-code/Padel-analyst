import type { Metadata, Viewport } from "next";
import { Figtree, Syne } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { StoreProvider } from "@/components/Store";
import "./globals.css";

const sans = Figtree({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"] });
const display = Syne({ subsets: ["latin"], variable: "--font-display", weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "Fondocampo", template: "%s · Fondocampo" },
  description: "Analisi colpo per colpo di partite di padel e tennis. Errori, colpi buoni e cosa allenare.",
  applicationName: "Fondocampo",
  appleWebApp: { capable: true, title: "Fondocampo", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#07110e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans antialiased">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
