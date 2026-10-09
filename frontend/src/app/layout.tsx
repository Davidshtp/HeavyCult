import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "HeavyCult",
    template: "%s · HeavyCult",
  },
  description:
    "ERP de HeavyCult: campañas, ventas y pedidos en un solo ecosistema.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${ibmPlexMono.variable} antialiased`}>
        {children}
        <Toaster
          position="top-right"
          // Queda por debajo del topbar sticky (`h-16` = 64px + 12px de aire).
          offset={76}
          gap={6}
          visibleToasts={3}
          duration={3500}
        />
      </body>
    </html>
  );
}