import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

export const metadata: Metadata = {
  title: "Staff Management System",
  description: "Centralized HR platform for employee management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased min-h-screen">
        <AuthProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
