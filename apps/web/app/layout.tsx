import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse · Smart Demand Signals",
  description: "Alertas comerciales accionables para Inibsa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b bg-white px-6 py-4">
          <h1 className="text-lg font-semibold">Pulse · Smart Demand Signals</h1>
        </header>
        {children}
      </body>
    </html>
  );
}
