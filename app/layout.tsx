import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/navbar";

export const metadata: Metadata = {
  title: "KZ Tax Advisor",
  description: "AI-powered tax consultant for Kazakhstan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-gray-50">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
