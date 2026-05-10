import type { Metadata } from "next";
import { Mulish } from "next/font/google";
import "./globals.css";

const mulish = Mulish({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-mulish",
});

export const metadata: Metadata = {
  title: "Pulse · Alert Notification Center",
  description: "Actionable commercial alerts for Inibsa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={mulish.variable}>
      <body>{children}</body>
    </html>
  );
}
