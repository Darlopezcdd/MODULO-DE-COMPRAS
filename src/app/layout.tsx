import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { Home, Users, FileText, BarChart3 } from "lucide-react";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Módulo de Compras — Proveedores",
  description: "Administración de proveedores",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
          {/* Sidebar */}
          <aside className="w-64 bg-slate-50 border-r border-slate-200 text-slate-800 flex flex-col hidden md:flex shadow-sm z-10">
            <div className="p-6">
              <h1 className="text-xl font-bold tracking-tight text-blue-600">Módulo Compras</h1>
            </div>
            <nav className="flex-1 px-4 space-y-2 mt-4">
              <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-blue-50 transition-colors text-slate-600 hover:text-blue-700 font-medium">
                <Home className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                <span>Inicio</span>
              </Link>
              <Link href="/proveedores" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-blue-50 transition-colors text-slate-600 hover:text-blue-700 font-medium">
                <Users className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                <span>Proveedores</span>
              </Link>
              <Link href="/facturas" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-blue-50 transition-colors text-slate-600 hover:text-blue-700 font-medium">
                <FileText className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                <span>Facturas</span>
              </Link>
              <Link href="/reportes" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-blue-50 transition-colors text-slate-600 hover:text-blue-700 font-medium">
                <BarChart3 className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                <span>Reportes</span>
              </Link>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto w-full bg-background">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
