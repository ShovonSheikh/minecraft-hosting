import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCPanel — Minecraft Server Control",
  description: "Professional Minecraft server management dashboard. Control, monitor, and configure your server.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
