import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MakitScale — Sistema de Costeo",
  description: "Sistema de costeo y métricas de producción en tiempo real. Costos precisos, recetas dinámicas, trazabilidad completa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full flex" style={{ background: "var(--bg-primary)" }}>
        <AuthProvider>
          <Toaster position="top-right" />
          <Sidebar />
          <main
            className="flex-1 min-h-screen"
            style={{ marginLeft: "var(--sidebar-width)", padding: "2rem 2.5rem" }}
          >
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
