import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Haemodynamic Compass",
  description: "Structured bedside haemodynamic assessment support"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
