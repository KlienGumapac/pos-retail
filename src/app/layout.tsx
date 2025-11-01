import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";

export const metadata: Metadata = {
  title: "Point of Sale System",
  description: "Professional Point of Sale System built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
