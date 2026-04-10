import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/navbar";
import AuthGuard from "./components/auth-guard";

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
        <AuthGuard>
          <Navbar />
          <main className="flex-1">{children}</main>
        </AuthGuard>
      </body>
    </html>
  );
}
