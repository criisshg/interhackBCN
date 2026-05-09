import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse · Smart Demand Signals",
  description: "Actionable commercial alerts for Inibsa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
